import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "./datetime";
import type {
  HeroState,
  ResetEvidence,
  ResetFeedCursor,
  ResetFeedItem,
  TrackerMetrics,
} from "./types";

const RESET_RECENTLY_WINDOW_MS = 24 * MS_PER_HOUR;

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function compareResetsDescending(a: ResetFeedCursor, b: ResetFeedCursor): number {
  const diff = Date.parse(b.resetAt) - Date.parse(a.resetAt);
  return diff || b.tweetId.localeCompare(a.tweetId);
}

export function sortResetsDescending<T extends ResetFeedCursor>(resets: readonly T[]): T[] {
  return [...resets].sort(compareResetsDescending);
}

export function computeHeroState(
  latestResetAt: string | null | undefined,
  now: Date = new Date(),
): HeroState {
  if (!latestResetAt) {
    return "empty";
  }

  const resetMs = new Date(latestResetAt).getTime();
  if (Number.isNaN(resetMs)) {
    return "empty";
  }

  const diffMs = now.getTime() - resetMs;
  return diffMs < RESET_RECENTLY_WINDOW_MS ? "reset_recently" : "waiting";
}

export function computeMetrics(
  resets: readonly ResetFeedCursor[],
  now: Date = new Date(),
): TrackerMetrics {
  const latest = resets.reduce<ResetFeedCursor | undefined>((current, reset) => {
    return !current || Date.parse(reset.resetAt) > Date.parse(current.resetAt) ? reset : current;
  }, undefined);
  return includeCurrentWait(computeHistoricalMetrics(resets), latest?.resetAt, now);
}

export function computeHistoricalMetrics(resets: readonly ResetFeedCursor[]): TrackerMetrics {
  const total = resets.length;
  if (total === 0) {
    return {
      total: 0,
      avgIntervalDays: null,
      longestWaitDays: null,
    };
  }

  const timestamps = resets.map(({ resetAt }) => Date.parse(resetAt)).sort((a, b) => a - b);
  let sumDays = 0;
  let longestDays = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const gapDays = (timestamps[i] - timestamps[i - 1]) / MS_PER_DAY;
    sumDays += gapDays;
    longestDays = Math.max(longestDays, gapDays);
  }

  return {
    total,
    avgIntervalDays: total > 1 ? roundOneDecimal(sumDays / (total - 1)) : null,
    longestWaitDays: roundOneDecimal(longestDays),
  };
}

export function includeCurrentWait(
  historicalMetrics: TrackerMetrics,
  latestResetAt: string | undefined,
  now: Date,
): TrackerMetrics {
  if (!latestResetAt || historicalMetrics.longestWaitDays === null) {
    return historicalMetrics;
  }

  const currentWaitDays = (now.getTime() - Date.parse(latestResetAt)) / MS_PER_DAY;
  return {
    ...historicalMetrics,
    longestWaitDays: Math.max(historicalMetrics.longestWaitDays, roundOneDecimal(currentWaitDays)),
  };
}

export function computeFeedIntervals(
  resets: readonly ResetEvidence[],
): ResetFeedItem[] {
  const descending = sortResetsDescending(resets);

  return descending.map((item, index) => {
    const older = descending[index + 1];
    if (!older) {
      return {
        ...item,
        gapMinutesFromPrevious: null,
      };
    }

    // Match the minute precision of the timestamps shown beside the badges.
    const currentMinute = Math.floor(Date.parse(item.resetAt) / MS_PER_MINUTE);
    const previousMinute = Math.floor(Date.parse(older.resetAt) / MS_PER_MINUTE);

    return {
      ...item,
      gapMinutesFromPrevious: currentMinute - previousMinute,
    };
  });
}
