import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { ResetRecord } from "@/lib/types";
import { getAdminFirestore } from "./firebase-admin";
import {
  createDefaultPushSender,
  getPushSubscriptionRepository,
  isWebPushConfigured,
  loadPushPage,
  sendResetPushPage,
} from "./push-service";

export const PUSH_JOBS_COLLECTION = "push_jobs";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const LEASE_MS = 60_000;
const MAX_PAGES_PER_RUN = 4;
const MAX_ATTEMPTS = 3;

function pushJobCollection() {
  return getAdminFirestore().collection(PUSH_JOBS_COLLECTION);
}

export function createPushJob(reset: ResetRecord, now: number) {
  return {
    reset: { tweetId: reset.tweetId, tweetText: reset.tweetText, summary: reset.summary },
    createdAt: now,
    dueAt: now,
    cursor: null as string | null,
    retryIds: [] as string[],
    attempt: 0,
    accepted: 0,
    failed: 0,
    expired: 0,
    removed: 0,
  };
}

type PushJob = ReturnType<typeof createPushJob>;

async function claimDueJob() {
  const db = getAdminFirestore();
  const now = Date.now();
  const due = await pushJobCollection().where("dueAt", "<=", now).orderBy("dueAt").limit(1).get();
  const ref = due.docs[0]?.ref;
  if (!ref) return null;
  const lease = randomUUID();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = snap.data() as PushJob | undefined;
    if (typeof job?.dueAt !== "number" || job.dueAt > now) return null;
    tx.update(ref, { lease, dueAt: now + LEASE_MS });
    return { job, ref, lease };
  });
}

export function nextPushPage(
  job: Pick<PushJob, "attempt">,
  page: { nextCursor: string | null; hasMore: boolean },
  retryIds: string[],
  now: number,
) {
  const attempt = job.attempt + 1;
  const retry = retryIds.length > 0 && attempt < MAX_ATTEMPTS;
  return {
    done: !page.hasMore && !retry,
    failed: retry ? 0 : retryIds.length,
    cursor: page.nextCursor,
    retryIds: retry ? retryIds : [],
    attempt: retry ? attempt : 0,
    dueAt: retry ? now + 60_000 * 2 ** (attempt - 1) : now,
  };
}

export async function drainPushJobs() {
  if (!isWebPushConfigured()) return;
  const db = getAdminFirestore();
  const repository = getPushSubscriptionRepository();
  const sender = createDefaultPushSender();

  for (let i = 0; i < MAX_PAGES_PER_RUN; i += 1) {
    const claim = await claimDueJob();
    if (!claim) return;
    const { job, ref, lease } = claim;
    const timedOut = Date.now() - job.createdAt >= MAX_AGE_MS;
    const page = timedOut ? null : await loadPushPage(repository, job.cursor, job.retryIds, job.createdAt);
    const result = page ? await sendResetPushPage(job.reset, page.recipients, sender) : null;
    const removed = result ? await repository.removeExpired(result.expired) : 0;
    const now = Date.now();
    const progress = page && result ? nextPushPage(job, page, result.retryIds, now) : null;
    const nextDue = progress && !progress.done ? progress.dueAt : FieldValue.delete();
    const done = !progress || progress.done;
    const stats = {
      accepted: job.accepted + (result?.accepted ?? 0),
      failed: job.failed + (result?.failed ?? 0) + (page?.skipped ?? 0) + (progress?.failed ?? job.retryIds.length),
      expired: job.expired + (result?.expired.length ?? 0),
      removed: (job.removed ?? 0) + removed,
    };

    const saved = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.get("lease") !== lease) return false;
      tx.update(ref, {
        ...stats,
        cursor: progress?.cursor ?? job.cursor,
        retryIds: progress?.retryIds ?? [],
        attempt: progress?.attempt ?? 0,
        status: timedOut ? "expired" : done ? "complete" : "pending",
        lease: FieldValue.delete(),
        dueAt: nextDue,
        updatedAt: now,
      });
      return true;
    });
    if (saved && done) console.info("Web Push job finished.", { ...stats, timedOut });
  }
}

export async function drainPushJobsSafely() {
  try {
    await drainPushJobs();
  } catch {
    console.error("Web Push queue processing failed. Pending work will be retried.");
  }
}
