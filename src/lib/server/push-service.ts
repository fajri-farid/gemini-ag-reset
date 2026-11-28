import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { FieldPath, type DocumentSnapshot, type Timestamp } from "firebase-admin/firestore";
import { sendNotification } from "web-push";
import { buildResetPushPayload, buildTestPushPayload, type PushNotificationPayload, type PushSubscriptionInput, type StoredPushSubscription } from "@/lib/push";
import { getSiteOrigin } from "@/lib/site-url";
import type { ResetRecord } from "@/lib/types";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./firebase-admin";
import { subscribeSchema, validVapidKeys } from "./push-request";

export const PUSH_SUBSCRIPTIONS_COLLECTION = "push_subscriptions";
export const PUSH_PAGE_SIZE = 50;
type ResetForPush = Pick<ResetRecord, "tweetId" | "tweetText" | "summary">;

export function hashPushEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint.trim()).digest("hex");
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() || getSiteOrigin();
  if (!publicKey || !privateKey || !validVapidKeys(publicKey, privateKey)) return null;

  try {
    const contact = new URL(subject);
    if (contact.protocol !== "https:" && !(contact.protocol === "mailto:" && contact.pathname)) return null;
  } catch {
    return null;
  }
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return isFirebaseAdminConfigured() && getVapidConfig() !== null;
}

function matchesAuth(stored: unknown, supplied: string): boolean {
  if (typeof stored !== "string") return false;
  const expected = Buffer.from(stored);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export interface PushSender {
  send(subscription: PushSubscriptionInput, payload: PushNotificationPayload): Promise<void>;
}

type PushRecipient = StoredPushSubscription & { version?: Timestamp };

function readRecipient(doc: DocumentSnapshot): PushRecipient | null {
  const data = doc.data();
  if (!data) return null;
  const parsed = subscribeSchema.safeParse({
    endpoint: data.endpoint,
    keys: data.keys,
    locale: data.locale === "id" ? "id" : "en",
  });
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    id: doc.id,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    version: doc.updateTime,
  };
}

export function getPushSubscriptionRepository() {
  const db = getAdminFirestore();
  const collection = db.collection(PUSH_SUBSCRIPTIONS_COLLECTION);

  return {
    async upsert(input: PushSubscriptionInput, existingOnly: boolean): Promise<boolean> {
      const ref = collection.doc(hashPushEndpoint(input.endpoint));
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const previous = snap.data();
        if (!previous && existingOnly) return false;
        if (previous && !matchesAuth(previous.keys?.auth, input.keys.auth)) return false;
        if (previous?.keys?.p256dh === input.keys.p256dh && previous.locale === input.locale) return true;
        const now = new Date().toISOString();
        tx.set(ref, {
          ...input,
          id: ref.id,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        });
        return true;
      });
    },

    async removeByEndpoint(endpoint: string, auth: string): Promise<boolean> {
      const ref = collection.doc(hashPushEndpoint(endpoint));
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return true;
        if (!matchesAuth(snap.get("keys.auth"), auth)) return false;
        tx.delete(ref);
        return true;
      });
    },

    async page(cursor: string | null, retryIds: string[]) {
      if (retryIds.length) {
        const docs = await db.getAll(...retryIds.map((id) => collection.doc(id)));
        return { docs, nextCursor: cursor, hasMore: true };
      }
      const query = collection.orderBy(FieldPath.documentId()).limit(PUSH_PAGE_SIZE + 1);
      const snap = await (cursor === null ? query : query.startAfter(cursor)).get();
      const docs = snap.docs.slice(0, PUSH_PAGE_SIZE);
      return {
        docs,
        nextCursor: docs.at(-1)?.id ?? cursor,
        hasMore: snap.size > PUSH_PAGE_SIZE,
      };
    },

    async removeExpired(recipients: readonly PushRecipient[]) {
      const results = await Promise.allSettled(recipients.map((recipient) =>
        collection.doc(recipient.id).delete({ lastUpdateTime: recipient.version }),
      ));
      return results.filter((result) => result.status === "fulfilled").length;
    },

    async count() {
      return (await collection.count().get()).data().count;
    },
  };
}

export function createDefaultPushSender(): PushSender {
  const vapid = getVapidConfig();
  return {
    async send(subscription, payload) {
      if (!vapid) throw new Error("Web Push VAPID keys are not configured.");
      const parsed = subscribeSchema.safeParse(subscription);
      if (!parsed.success) throw new Error("Invalid push subscription.");

      await sendNotification(
        { endpoint: parsed.data.endpoint, keys: parsed.data.keys },
        JSON.stringify(payload),
        {
          TTL: 3600,
          timeout: 3500,
          topic: createHash("sha256").update(payload.tag).digest("base64url").slice(0, 32),
          vapidDetails: vapid,
        },
      );
    },
  };
}

export async function sendResetPushPage(
  reset: ResetForPush,
  recipients: readonly PushRecipient[],
  sender: PushSender,
) {
  const payloads = {
    en: buildResetPushPayload(reset, "en"),
    id: buildResetPushPayload(reset, "id"),
  };
  const outcomes = await Promise.allSettled(
    recipients.map((recipient) => sender.send(recipient, payloads[recipient.locale])),
  );
  const expired: PushRecipient[] = [];
  const retryIds: string[] = [];
  let accepted = 0;
  let failed = 0;
  outcomes.forEach((outcome, index) => {
    const recipient = recipients[index];
    if (outcome.status === "fulfilled") {
      accepted += 1;
      return;
    }
    const status = (outcome.reason as { statusCode?: number } | null)?.statusCode;
    if (status === 404 || status === 410) expired.push(recipient);
    else if (!status || status === 429 || status >= 500) retryIds.push(recipient.id);
    else failed += 1;
  });
  return { accepted, failed, expired, retryIds };
}

export async function loadPushPage(
  repository: ReturnType<typeof getPushSubscriptionRepository>,
  cursor: string | null,
  retryIds: string[],
  createdAt: number,
) {
  const { docs, nextCursor, hasMore } = await repository.page(cursor, retryIds);
  const recipients: PushRecipient[] = [];
  let skipped = 0;
  const cutoff = new Date(createdAt).toISOString();
  for (const doc of docs) {
    if (!doc.exists) continue;
    const recipient = readRecipient(doc);
    if (!recipient) skipped += 1;
    else if (recipient.createdAt <= cutoff) recipients.push(recipient);
  }
  return { recipients, nextCursor, hasMore, skipped };
}

export async function sendTestPushToSubscription(
  subscription: PushSubscriptionInput,
  options?: { sender?: PushSender; latestReset?: ResetForPush | null },
): Promise<void> {
  const sender = options?.sender ?? createDefaultPushSender();
  const payload = buildTestPushPayload(subscription.locale, options?.latestReset);
  await sender.send(subscription, payload);
}
