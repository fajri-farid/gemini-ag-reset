import "server-only";
import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { sortResetsDescending } from "@/lib/metrics";
import { buildCanonicalTweetUrl } from "@/lib/tweet-url";
import type {
  EvaluatedTweetLog,
  ResetRecord,
  ResetSource,
  SyncErrorStage,
  SyncLog,
  SyncStatus,
  SyncStatusState,
  SyncTrigger,
} from "@/lib/types";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./firebase-admin";

export const MAX_SYNC_LOGS = 50;

export const COLLECTIONS = {
  resets: "resets",
  syncStatus: "sync_status",
  syncLogs: "sync_logs",
} as const;

export const SYNC_STATUS_DOC_ID = "main";

export interface UpsertResetInput {
  tweetId: string;
  tweetUrl?: string;
  tweetText: string;
  summary?: string | null;
  confidence?: number | null;
  source: ResetSource;
  resetAt: string;
}

export interface UpdateResetPatch {
  tweetText?: string;
  summary?: string | null;
  resetAt?: string;
}

export interface UpdateSyncStatusPatch {
  lastCheckedAt?: string | null;
  lastSeenTweetId?: string | null;
  lastStatus?: SyncStatusState;
  lastErrorMessage?: string | null;
  trackingStartedAt?: string;
}

export interface AppendSyncLogInput {
  ranAt: string;
  trigger: SyncTrigger;
  status: SyncStatusState;
  fetchedCount: number;
  savedCount: number;
  skippedCount: number;
  durationMs: number;
  errorStage: SyncErrorStage;
  errorMessage: string | null;
  evaluatedTweets: EvaluatedTweetLog[];
}

export interface ResetRepository {
  listResets(): Promise<ResetRecord[]>;
  getReset(tweetId: string): Promise<ResetRecord | null>;
  upsertReset(input: UpsertResetInput): Promise<ResetRecord>;
  updateReset(
    tweetId: string,
    patch: UpdateResetPatch,
  ): Promise<ResetRecord | null>;
  deleteReset(tweetId: string): Promise<boolean>;
  getSyncStatus(): Promise<SyncStatus>;
  updateSyncStatus(patch: UpdateSyncStatusPatch): Promise<SyncStatus>;
  appendSyncLog(input: AppendSyncLogInput): Promise<SyncLog>;
  listSyncLogs(limit?: number): Promise<SyncLog[]>;
}

function getDefaultTrackingStartIso(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  ).toISOString();
}

function createDefaultSyncStatus(now: Date = new Date()): SyncStatus {
  return {
    lastCheckedAt: null,
    lastSeenTweetId: null,
    lastStatus: "ok",
    lastErrorMessage: null,
    trackingStartedAt: getDefaultTrackingStartIso(now),
  };
}

function clampLogsLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return MAX_SYNC_LOGS;
  }
  return Math.max(1, Math.min(MAX_SYNC_LOGS, Math.floor(limit)));
}

function sortLogsDescending(logs: readonly SyncLog[]): SyncLog[] {
  return [...logs].sort((a, b) => {
    const diff = new Date(b.ranAt).getTime() - new Date(a.ranAt).getTime();
    if (diff !== 0) {
      return diff;
    }
    return b.id.localeCompare(a.id);
  });
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return fallback;
}

export class InMemoryResetRepository implements ResetRepository {
  private readonly resets = new Map<string, ResetRecord>();
  private syncStatus: SyncStatus;
  private syncLogs: SyncLog[] = [];

  constructor(initial?: {
    resets?: ResetRecord[];
    syncStatus?: Partial<SyncStatus>;
    syncLogs?: SyncLog[];
  }) {
    if (initial?.resets) {
      for (const item of initial.resets) {
        this.resets.set(item.tweetId, { ...item });
      }
    }
    this.syncStatus = {
      ...createDefaultSyncStatus(),
      ...initial?.syncStatus,
    };
    if (initial?.syncLogs) {
      this.syncLogs = sortLogsDescending(initial.syncLogs).slice(
        0,
        MAX_SYNC_LOGS,
      );
    }
  }

  async listResets(): Promise<ResetRecord[]> {
    return sortResetsDescending(Array.from(this.resets.values()));
  }

  async getReset(tweetId: string): Promise<ResetRecord | null> {
    const found = this.resets.get(tweetId);
    return found ? { ...found } : null;
  }

  async upsertReset(input: UpsertResetInput): Promise<ResetRecord> {
    const nowIso = new Date().toISOString();
    const existing = this.resets.get(input.tweetId);

    const record: ResetRecord = {
      tweetId: input.tweetId,
      tweetUrl: input.tweetUrl ?? buildCanonicalTweetUrl(input.tweetId),
      tweetText: input.tweetText,
      summary: input.summary ?? null,
      confidence: input.confidence ?? null,
      source: input.source,
      resetAt: input.resetAt,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };

    this.resets.set(record.tweetId, record);
    return { ...record };
  }

  async updateReset(
    tweetId: string,
    patch: UpdateResetPatch,
  ): Promise<ResetRecord | null> {
    const existing = this.resets.get(tweetId);
    if (!existing) {
      return null;
    }

    const updated: ResetRecord = {
      ...existing,
      ...(patch.tweetText !== undefined ? { tweetText: patch.tweetText } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      ...(patch.resetAt !== undefined ? { resetAt: patch.resetAt } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.resets.set(tweetId, updated);
    return { ...updated };
  }

  async deleteReset(tweetId: string): Promise<boolean> {
    return this.resets.delete(tweetId);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return { ...this.syncStatus };
  }

  async updateSyncStatus(patch: UpdateSyncStatusPatch): Promise<SyncStatus> {
    this.syncStatus = {
      ...this.syncStatus,
      ...patch,
    };
    return { ...this.syncStatus };
  }

  async appendSyncLog(input: AppendSyncLogInput): Promise<SyncLog> {
    const log: SyncLog = {
      id: `${input.ranAt.replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      evaluatedTweets: input.evaluatedTweets.map((item) => ({ ...item })),
    };

    this.syncLogs = sortLogsDescending([log, ...this.syncLogs]).slice(
      0,
      MAX_SYNC_LOGS,
    );

    return {
      ...log,
      evaluatedTweets: log.evaluatedTweets.map((item) => ({ ...item })),
    };
  }

  async listSyncLogs(limit?: number): Promise<SyncLog[]> {
    const safeLimit = clampLogsLimit(limit);
    return this.syncLogs.slice(0, safeLimit).map((item) => ({
      ...item,
      evaluatedTweets: item.evaluatedTweets.map((t) => ({ ...t })),
    }));
  }
}

export class FirestoreResetRepository implements ResetRepository {
  constructor(private readonly db: Firestore) {}

  private mapResetDoc(
    docId: string,
    data: FirebaseFirestore.DocumentData,
  ): ResetRecord {
    const nowIso = new Date().toISOString();
    const tweetId = typeof data.tweetId === "string" ? data.tweetId : docId;

    return {
      tweetId,
      tweetUrl:
        typeof data.tweetUrl === "string"
          ? data.tweetUrl
          : buildCanonicalTweetUrl(tweetId),
      tweetText: typeof data.tweetText === "string" ? data.tweetText : "",
      summary: typeof data.summary === "string" ? data.summary : null,
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      source: data.source === "manual" ? "manual" : "auto",
      resetAt: toIsoString(data.resetAt, nowIso),
      createdAt: toIsoString(data.createdAt, nowIso),
      updatedAt: toIsoString(data.updatedAt, nowIso),
    };
  }

  async listResets(): Promise<ResetRecord[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.resets)
      .orderBy("resetAt", "desc")
      .get();

    const records = snapshot.docs.map((doc) =>
      this.mapResetDoc(doc.id, doc.data()),
    );
    return sortResetsDescending(records);
  }

  async getReset(tweetId: string): Promise<ResetRecord | null> {
    const doc = await this.db
      .collection(COLLECTIONS.resets)
      .doc(tweetId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return this.mapResetDoc(doc.id, doc.data() ?? {});
  }

  async upsertReset(input: UpsertResetInput): Promise<ResetRecord> {
    const docRef = this.db.collection(COLLECTIONS.resets).doc(input.tweetId);
    const nowIso = new Date().toISOString();
    const existingSnap = await docRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : undefined;

    const record: ResetRecord = {
      tweetId: input.tweetId,
      tweetUrl: input.tweetUrl ?? buildCanonicalTweetUrl(input.tweetId),
      tweetText: input.tweetText,
      summary: input.summary ?? null,
      confidence: input.confidence ?? null,
      source: input.source,
      resetAt: input.resetAt,
      createdAt: existingData
        ? toIsoString(existingData.createdAt, nowIso)
        : nowIso,
      updatedAt: nowIso,
    };

    await docRef.set(record);
    return record;
  }

  async updateReset(
    tweetId: string,
    patch: UpdateResetPatch,
  ): Promise<ResetRecord | null> {
    const docRef = this.db.collection(COLLECTIONS.resets).doc(tweetId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return null;
    }

    const existing = this.mapResetDoc(snap.id, snap.data() ?? {});
    const updated: ResetRecord = {
      ...existing,
      ...(patch.tweetText !== undefined ? { tweetText: patch.tweetText } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      ...(patch.resetAt !== undefined ? { resetAt: patch.resetAt } : {}),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(updated);
    return updated;
  }

  async deleteReset(tweetId: string): Promise<boolean> {
    const docRef = this.db.collection(COLLECTIONS.resets).doc(tweetId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const docRef = this.db
      .collection(COLLECTIONS.syncStatus)
      .doc(SYNC_STATUS_DOC_ID);
    const snap = await docRef.get();
    const defaults = createDefaultSyncStatus();

    if (!snap.exists) {
      return defaults;
    }

    const data = snap.data() ?? {};
    return {
      lastCheckedAt:
        data.lastCheckedAt === null || data.lastCheckedAt === undefined
          ? null
          : toIsoString(data.lastCheckedAt, defaults.trackingStartedAt),
      lastSeenTweetId:
        typeof data.lastSeenTweetId === "string" ? data.lastSeenTweetId : null,
      lastStatus: data.lastStatus === "error" ? "error" : "ok",
      lastErrorMessage:
        typeof data.lastErrorMessage === "string"
          ? data.lastErrorMessage
          : null,
      trackingStartedAt: toIsoString(
        data.trackingStartedAt,
        defaults.trackingStartedAt,
      ),
    };
  }

  async updateSyncStatus(patch: UpdateSyncStatusPatch): Promise<SyncStatus> {
    const current = await this.getSyncStatus();
    const nextStatus: SyncStatus = {
      ...current,
      ...patch,
    };

    await this.db
      .collection(COLLECTIONS.syncStatus)
      .doc(SYNC_STATUS_DOC_ID)
      .set(nextStatus);

    return nextStatus;
  }

  async appendSyncLog(input: AppendSyncLogInput): Promise<SyncLog> {
    const id = `${input.ranAt.replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
    const log: SyncLog = {
      id,
      ...input,
    };

    const collection = this.db.collection(COLLECTIONS.syncLogs);
    await collection.doc(id).set(log);

    const orderedSnap = await collection.orderBy("ranAt", "desc").get();
    if (orderedSnap.docs.length > MAX_SYNC_LOGS) {
      const batch = this.db.batch();
      for (const staleDoc of orderedSnap.docs.slice(MAX_SYNC_LOGS)) {
        batch.delete(staleDoc.ref);
      }
      await batch.commit();
    }

    return log;
  }

  async listSyncLogs(limit?: number): Promise<SyncLog[]> {
    const safeLimit = clampLogsLimit(limit);
    const snap = await this.db
      .collection(COLLECTIONS.syncLogs)
      .orderBy("ranAt", "desc")
      .limit(safeLimit)
      .get();

    const nowIso = new Date().toISOString();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: typeof data.id === "string" ? data.id : doc.id,
        ranAt: toIsoString(data.ranAt, nowIso),
        trigger:
          data.trigger === "cron" ||
          data.trigger === "admin_live" ||
          data.trigger === "admin_dry_run"
            ? data.trigger
            : "cron",
        status: data.status === "error" ? "error" : "ok",
        fetchedCount:
          typeof data.fetchedCount === "number" ? data.fetchedCount : 0,
        savedCount: typeof data.savedCount === "number" ? data.savedCount : 0,
        skippedCount:
          typeof data.skippedCount === "number" ? data.skippedCount : 0,
        durationMs: typeof data.durationMs === "number" ? data.durationMs : 0,
        errorStage:
          data.errorStage === "x_fetch" ||
          data.errorStage === "gemini" ||
          data.errorStage === "db"
            ? data.errorStage
            : "none",
        errorMessage:
          typeof data.errorMessage === "string" ? data.errorMessage : null,
        evaluatedTweets: Array.isArray(data.evaluatedTweets)
          ? (data.evaluatedTweets as EvaluatedTweetLog[])
          : [],
      };
    });
  }
}

let cachedFallbackRepository: InMemoryResetRepository | null = null;
let cachedFirestoreRepository: FirestoreResetRepository | null = null;

export function getResetRepository(): ResetRepository {
  if (isFirebaseAdminConfigured()) {
    if (!cachedFirestoreRepository) {
      cachedFirestoreRepository = new FirestoreResetRepository(
        getAdminFirestore(),
      );
    }
    return cachedFirestoreRepository;
  }

  if (!cachedFallbackRepository) {
    cachedFallbackRepository = new InMemoryResetRepository();
  }
  return cachedFallbackRepository;
}
