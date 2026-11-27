import "server-only";
import { formatGapBadge, toDateKeyInTimeZone } from "@/lib/datetime";
import { buildDynamicHeatmap } from "@/lib/heatmap";
import {
  computeHeroState,
  computeMetrics,
  sortResetsDescending,
} from "@/lib/metrics";
import { getSiteDisplayHost, getSiteOrigin } from "@/lib/site-url";
import type {
  DynamicHeatmapData,
  HeroState,
  Locale,
  PublicTrackerPayload,
  ResetEvidence,
  TrackerMetrics,
} from "@/lib/types";
import { getCachedPublicTrackerData } from "./public-data";

export const MINI_HEATMAP_WEEKS = 8;

export interface ShareCardViewModel {
  mode: "hero" | "item";
  heroState: HeroState;
  reset: ResetEvidence | null;
  metrics: TrackerMetrics;
  locale: Locale;
  timeZone: string;
  nowIso: string;
  gapLabel: string | null;
  highlightedDateKey: string | null;
  miniHeatmap: DynamicHeatmapData;
  displayHost: string;
  siteOrigin: string;
}

export interface BuildShareCardViewModelOptions {
  tweetId?: string | null;
  locale: Locale;
  timeZone: string;
  now?: Date;
}

/**
 * Projects verified tracker data into a render-ready view model for 4:5, 9:16,
 * and OG image cards. Returns `null` when a requested `tweetId` does not exist.
 */
export function buildShareCardViewModel(
  payload: PublicTrackerPayload,
  { tweetId = null, locale, timeZone, now }: BuildShareCardViewModelOptions,
): ShareCardViewModel | null {
  const referenceNow = now ?? new Date(payload.generatedAt);
  const descending = sortResetsDescending(payload.resets);

  let selectedReset: ResetEvidence | null = descending[0] ?? null;
  let mode: "hero" | "item" = "hero";
  let heroState: HeroState = payload.heroState;
  let gapLabel: string | null = null;

  if (tweetId) {
    const targetIndex = descending.findIndex(
      (item) => item.tweetId === tweetId,
    );
    if (targetIndex === -1) {
      return null;
    }

    mode = "item";
    selectedReset = descending[targetIndex];
    heroState = computeHeroState(selectedReset.resetAt, referenceNow);

    const previousReset = descending[targetIndex + 1];
    if (previousReset) {
      const currentMinute = Math.floor(
        Date.parse(selectedReset.resetAt) / 60_000,
      );
      const previousMinute = Math.floor(
        Date.parse(previousReset.resetAt) / 60_000,
      );
      gapLabel = formatGapBadge(currentMinute - previousMinute, locale);
    }
  } else if (selectedReset && descending[1]) {
    const currentMinute = Math.floor(
      Date.parse(selectedReset.resetAt) / 60_000,
    );
    const previousMinute = Math.floor(
      Date.parse(descending[1].resetAt) / 60_000,
    );
    gapLabel = formatGapBadge(currentMinute - previousMinute, locale);
  }

  const earliestResetAt = descending.at(-1)?.resetAt;
  const trackingStartedAt =
    earliestResetAt &&
    Date.parse(earliestResetAt) < Date.parse(payload.syncStatus.trackingStartedAt)
      ? earliestResetAt
      : payload.syncStatus.trackingStartedAt;

  const miniHeatmap = buildDynamicHeatmap({
    resets: descending,
    trackingStartedAt,
    timeZone,
    locale,
    now: referenceNow,
    maxWeeks: MINI_HEATMAP_WEEKS,
  });

  const highlightedDateKey = selectedReset
    ? toDateKeyInTimeZone(selectedReset.resetAt, timeZone)
    : null;

  const metrics =
    payload.metrics.total === descending.length
      ? payload.metrics
      : computeMetrics(descending, referenceNow);

  return {
    mode,
    heroState,
    reset: selectedReset,
    metrics,
    locale,
    timeZone,
    nowIso: referenceNow.toISOString(),
    gapLabel,
    highlightedDateKey,
    miniHeatmap,
    displayHost: getSiteDisplayHost(),
    siteOrigin: getSiteOrigin(),
  };
}

/**
 * Loads cached Firestore tracker data and builds the verified share card model.
 */
export async function loadShareCardViewModel(
  options: BuildShareCardViewModelOptions,
): Promise<ShareCardViewModel | null> {
  const payload = await getCachedPublicTrackerData();
  return buildShareCardViewModel(payload, options);
}
