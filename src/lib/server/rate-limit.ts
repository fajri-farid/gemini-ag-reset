import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { Timestamp } from "firebase-admin/firestore";
import { MS_PER_DAY } from "@/lib/datetime";
import { MAX_HOURLY_NOTES_PER_VISITOR } from "@/lib/sticky-notes";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./firebase-admin";

export const RATE_LIMITS_COLLECTION = "rate_limits";
const DEFAULT_DAILY_MODERATION_LIMIT = 100;
const MAX_DAILY_MODERATION_LIMIT = 300;

export async function reservePushAttempt(request: Request, action: "subscribe" | "unsubscribe"): Promise<boolean> {
  const db = getAdminFirestore();
  const now = new Date();
  const iso = now.toISOString();
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for") : null;
  const buckets = db.collection(RATE_LIMITS_COLLECTION);
  const global = buckets.doc(`push_${action}_${iso.slice(0, 10)}`);
  const visitor = ip && isIP(ip)
    ? buckets.doc(`push_${action}_${createHash("sha256").update(ip).digest("hex")}_${iso.slice(0, 13)}`)
    : null;

  return db.runTransaction(async (tx) => {
    const [globalSnap, visitorSnap] = await Promise.all([
      tx.get(global),
      visitor ? tx.get(visitor) : null,
    ]);
    const total = (globalSnap.get("count") as number | undefined) ?? 0;
    const perVisitor = (visitorSnap?.get("count") as number | undefined) ?? 0;
    if (total >= 500 || perVisitor >= 15) return false;
    const expiresAt = retentionDate(now);
    tx.set(global, { count: total + 1, expiresAt });
    if (visitor) tx.set(visitor, { count: perVisitor + 1, expiresAt });
    return true;
  });
}

function getDailyModerationLimit() {
  const configured = Number(process.env.COMMUNITY_MODERATION_DAILY_LIMIT);
  return Number.isInteger(configured) && configured > 0
    ? Math.min(configured, MAX_DAILY_MODERATION_LIMIT)
    : DEFAULT_DAILY_MODERATION_LIMIT;
}

export function retentionDate(now: Date) {
  return Timestamp.fromMillis(now.getTime() + 2 * MS_PER_DAY);
}

export interface RateLimiter {
  reserveNoteAttempt(visitor: string, now: Date): Promise<"allowed" | "visitor" | "global">;
}

function noteBuckets(visitor: string, now: Date) {
  const iso = now.toISOString();
  return {
    visitorKey: "note_" + visitor + "_" + iso.slice(0, 13),
    globalKey: "notes_global_" + iso.slice(0, 10),
  };
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; expiresAt: number }>();

  async reserveNoteAttempt(visitor: string, now: Date) {
    for (const [key, value] of this.buckets) {
      if (value.expiresAt <= now.getTime()) this.buckets.delete(key);
    }
    const { visitorKey, globalKey } = noteBuckets(visitor, now);
    const used = this.buckets.get(visitorKey)?.count ?? 0;
    const global = this.buckets.get(globalKey)?.count ?? 0;
    if (used >= MAX_HOURLY_NOTES_PER_VISITOR) return "visitor";
    if (global >= getDailyModerationLimit()) return "global";
    const expiresAt = retentionDate(now).toMillis();
    this.buckets.set(visitorKey, { count: used + 1, expiresAt });
    this.buckets.set(globalKey, { count: global + 1, expiresAt });
    return "allowed";
  }
}

const memoryLimiter = new InMemoryRateLimiter();

export function getRateLimiter(): RateLimiter {
  if (!isFirebaseAdminConfigured()) return memoryLimiter;
  const db = getAdminFirestore();
  return {
    async reserveNoteAttempt(visitor, now) {
      const { visitorKey, globalKey } = noteBuckets(visitor, now);
      const visitorRef = db.collection(RATE_LIMITS_COLLECTION).doc(visitorKey);
      const globalRef = db.collection(RATE_LIMITS_COLLECTION).doc(globalKey);

      return db.runTransaction(async (tx) => {
        const visitorSnap = await tx.get(visitorRef);
        const used = visitorSnap.get("count") ?? 0;
        if (used >= MAX_HOURLY_NOTES_PER_VISITOR) return "visitor";
        const globalSnap = await tx.get(globalRef);
        const global = globalSnap.get("count") ?? 0;
        if (global >= getDailyModerationLimit()) return "global";
        const expiresAt = retentionDate(now);
        tx.set(visitorRef, { count: used + 1, expiresAt });
        tx.set(globalRef, { count: global + 1, expiresAt });
        return "allowed";
      });
    },
  };
}

export async function pruneRateLimitBuckets(): Promise<void> {
  const db = getAdminFirestore();
  const buckets = db.collection(RATE_LIMITS_COLLECTION);
  const now = Timestamp.now();
  const snapshots = await buckets.where("expiresAt", "<=", now).limit(150).get();
  const remaining = 150 - snapshots.size;
  // Older installations wrote this field as an ISO string.
  const legacy = remaining > 0
    ? await buckets.where("expiresAt", "<=", now.toDate().toISOString()).limit(remaining).get()
    : null;
  const expired = [...snapshots.docs, ...legacy?.docs ?? []];
  if (expired.length === 0) return;
  const writer = db.bulkWriter();
  const results = expired.map((doc) =>
    writer.delete(doc.ref, { lastUpdateTime: doc.updateTime }),
  );
  await Promise.all([writer.close(), Promise.all(results)]);
}
