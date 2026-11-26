import { compareResetsDescending, computeFeedIntervals } from "./metrics";
import type { ResetEvidence, ResetFeedCursor, ResetFeedPage } from "./types";

export function paginateResetFeed(
  orderedResets: readonly ResetEvidence[],
  count: number,
  after?: ResetFeedCursor,
): ResetFeedPage {
  const start = after
    ? orderedResets.findIndex((reset) => compareResetsDescending(reset, after) > 0)
    : 0;
  if (start === -1) {
    return { items: [], nextCursor: null };
  }

  const batch = orderedResets.slice(start, start + count + 1);
  const items = computeFeedIntervals(batch.map(({ tweetId, tweetUrl, tweetText, resetAt }) => ({
    tweetId, tweetUrl, tweetText, resetAt,
  }))).slice(0, count);
  const last = batch[count - 1];
  return {
    items,
    nextCursor:
      batch.length > count
        ? { tweetId: last.tweetId, resetAt: new Date(last.resetAt).toISOString() }
        : null,
  };
}
