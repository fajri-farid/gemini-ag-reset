import "server-only";
import { cacheLife, cacheTag, revalidatePath, revalidateTag } from "next/cache";
import { computeHeroState, computeMetrics } from "@/lib/metrics";
import type { PublicTrackerPayload } from "@/lib/types";
import { getResetRepository, type ResetRepository } from "./reset-repository";

export const RESETS_CACHE_TAG = "resets";

export function revalidatePublicResets(): void {
  try {
    revalidateTag(RESETS_CACHE_TAG, { expire: 0 });
    revalidatePath("/");
  } catch {
    // Abaikan saat dipanggil di luar konteks request Next.js (mis. unit test).
  }
}

export async function getPublicTrackerData(
  repository: ResetRepository = getResetRepository(),
): Promise<PublicTrackerPayload> {
  const [resets, syncStatus] = await Promise.all([
    repository.listResets(),
    repository.getSyncStatus(),
  ]);

  const metrics = computeMetrics(resets);
  const heroState = computeHeroState(resets[0]?.resetAt ?? null);

  return {
    resets,
    metrics,
    heroState,
    syncStatus: {
      lastCheckedAt: syncStatus.lastCheckedAt,
      lastStatus: syncStatus.lastStatus,
      trackingStartedAt: syncStatus.trackingStartedAt,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getCachedPublicTrackerData(): Promise<PublicTrackerPayload> {
  "use cache";
  cacheLife({
    revalidate: 300,
    stale: 60,
    expire: 3600,
  });
  cacheTag(RESETS_CACHE_TAG);

  return getPublicTrackerData();
}
