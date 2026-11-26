import "server-only";
import { cacheLife, cacheTag, revalidatePath, revalidateTag } from "next/cache";
import { MS_PER_DAY } from "@/lib/datetime";
import { HEATMAP_MAX_WEEKS } from "@/lib/heatmap";
import { computeHeroState, computeMetrics, computeHistoricalMetrics } from "@/lib/metrics";
import { paginateResetFeed } from "@/lib/reset-feed";
import type { PublicTrackerHomeData, PublicTrackerPayload, ResetFeedCursor } from "@/lib/types";
import { getResetRepository } from "./reset-repository";

const RESETS_CACHE_TAG = "resets";
const STATUS_CACHE_TAG = "tracker-sync-status";
const PUBLIC_CACHE_LIFE = { revalidate: 300, stale: 60, expire: 3600 };

export function revalidatePublicResets(): void {
  revalidateTag(RESETS_CACHE_TAG, { expire: 0 });
  revalidatePath("/");
  revalidatePath("/api/resets");
}

export function revalidatePublicTrackerStatus(resetsChanged = false): void {
  revalidateTag(STATUS_CACHE_TAG, { expire: 0 });
  if (resetsChanged) {
    revalidatePublicResets();
  }
}

async function getCachedResetArchive() {
  "use cache: remote";
  cacheLife({ revalidate: 3600, stale: 60, expire: 86400 });
  cacheTag(RESETS_CACHE_TAG);
  return getResetRepository().listResets();
}

async function getCachedPublicSyncStatus(): Promise<PublicTrackerPayload["syncStatus"]> {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(STATUS_CACHE_TAG);
  const { lastCheckedAt, lastStatus, trackingStartedAt } = await getResetRepository().getSyncStatus();
  return { lastCheckedAt, lastStatus, trackingStartedAt };
}

export async function getCachedPublicTrackerData(): Promise<PublicTrackerPayload> {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE);

  const [resets, syncStatus] = await Promise.all([getCachedResetArchive(), getCachedPublicSyncStatus()]);
  const now = new Date();
  return {
    resets,
    metrics: computeMetrics(resets, now),
    heroState: computeHeroState(resets[0]?.resetAt, now),
    syncStatus,
    generatedAt: now.toISOString(),
  };
}

export async function getCachedPublicTrackerHomeData(): Promise<PublicTrackerHomeData> {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE);

  const [resets, syncStatus] = await Promise.all([getCachedResetArchive(), getCachedPublicSyncStatus()]);
  const now = new Date();
  // Include UTC days on either side of the local heatmap window.
  const cutoff = now.getTime() - (HEATMAP_MAX_WEEKS * 7 + 2) * MS_PER_DAY;
  const earliest = resets.at(-1)?.resetAt;
  const trackingStartedAt = earliest && Date.parse(earliest) < Date.parse(syncStatus.trackingStartedAt)
    ? earliest
    : syncStatus.trackingStartedAt;

  return {
    feed: paginateResetFeed(resets, 5),
    heatmapResets: resets.filter(({ resetAt }) => Date.parse(resetAt) >= cutoff)
      .map(({ tweetId, tweetUrl, tweetText, resetAt }) => ({
        tweetId,
        tweetUrl,
        tweetText: tweetText.length > 180 ? `${tweetText.slice(0, 179)}…` : tweetText,
        resetAt,
      })),
    historicalMetrics: computeHistoricalMetrics(resets),
    syncStatus: { ...syncStatus, trackingStartedAt },
    generatedAt: now.toISOString(),
  };
}

export async function getMorePublicFeedItems(after: ResetFeedCursor) {
  const resets = await getCachedResetArchive();
  return paginateResetFeed(resets, 2, after);
}
