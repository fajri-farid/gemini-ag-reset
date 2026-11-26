import { MS_PER_DAY, MS_PER_HOUR } from "./datetime";
import type {
  HeroState,
  ResetFeedItem,
  ResetRecord,
  TrackerMetrics,
} from "./types";

const RESET_RECENTLY_WINDOW_MS = 24 * MS_PER_HOUR;

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function sortResetsDescending(
  resets: readonly ResetRecord[],
): ResetRecord[] {
  return [...resets].sort((a, b) => {
    const diff = new Date(b.resetAt).getTime() - new Date(a.resetAt).getTime();
    if (diff !== 0) {
      return diff;
    }
    return b.tweetId.localeCompare(a.tweetId);
  });
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
  resets: readonly ResetRecord[],
  now: Date = new Date(),
): TrackerMetrics {
  const total = resets.length;
  if (total === 0) {
    return {
      total: 0,
      avgIntervalDays: null,
      longestWaitDays: null,
    };
  }

  const ascending = [...resets].sort(
    (a, b) => new Date(a.resetAt).getTime() - new Date(b.resetAt).getTime(),
  );

  const gapsDays: number[] = [];
  for (let i = 1; i < ascending.length; i += 1) {
    const prevMs = new Date(ascending[i - 1].resetAt).getTime();
    const currMs = new Date(ascending[i].resetAt).getTime();
    const diffDays = Math.max(0, (currMs - prevMs) / MS_PER_DAY);
    gapsDays.push(diffDays);
  }

  const avgIntervalDays =
    gapsDays.length > 0
      ? roundOneDecimal(
          gapsDays.reduce((sum, gap) => sum + gap, 0) / gapsDays.length,
        )
      : null;

  const latestMs = new Date(ascending[ascending.length - 1].resetAt).getTime();
  const currentWaitDays = Math.max(0, (now.getTime() - latestMs) / MS_PER_DAY);
  const longestWaitDays = roundOneDecimal(Math.max(currentWaitDays, ...gapsDays));

  return {
    total,
    avgIntervalDays,
    longestWaitDays,
  };
}

export function computeFeedIntervals(
  resets: readonly ResetRecord[],
): ResetFeedItem[] {
  const descending = sortResetsDescending(resets);

  return descending.map((item, index) => {
    const older = descending[index + 1];
    if (!older) {
      return {
        ...item,
        gapDaysFromPrevious: null,
      };
    }

    const diffMs =
      new Date(item.resetAt).getTime() - new Date(older.resetAt).getTime();
    const gapDays = roundOneDecimal(Math.max(0, diffMs / MS_PER_DAY));

    return {
      ...item,
      gapDaysFromPrevious: gapDays,
    };
  });
}
