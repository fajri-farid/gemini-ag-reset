import { describe, expect, it } from "vitest";
import {
  computeFeedIntervals,
  computeHeroState,
  computeMetrics,
  sortResetsDescending,
} from "../metrics";
import { paginateResetFeed } from "../reset-feed";
import type { ResetRecord } from "../types";

function makeReset(tweetId: string, resetAt: string): ResetRecord {
  return {
    tweetId,
    tweetUrl: `https://x.com/_mohansolo/status/${tweetId}`,
    tweetText: `Reset announcement ${tweetId}`,
    summary: `Summary ${tweetId}`,
    confidence: 0.96,
    source: "auto",
    resetAt,
    createdAt: resetAt,
    updatedAt: resetAt,
  };
}

describe("paginateResetFeed", () => {
  it("returns five announcements then two at a time with the correct gaps at page boundaries", () => {
    const resets = Array.from({ length: 10 }, (_, i) =>
      makeReset(String(1010 - i), new Date(Date.UTC(2026, 10, 26 - i * 2)).toISOString()),
    );

    const first = paginateResetFeed(resets, 5);
    const second = paginateResetFeed(resets, 2, first.nextCursor!);
    const third = paginateResetFeed(resets, 2, second.nextCursor!);
    const last = paginateResetFeed(resets, 2, third.nextCursor!);

    expect(first.items.map((item) => item.tweetId)).toEqual(["1010", "1009", "1008", "1007", "1006"]);
    expect(first.items.at(-1)?.gapMinutesFromPrevious).toBe(2880);
    expect(second.items.map((item) => item.tweetId)).toEqual(["1005", "1004"]);
    expect(second.items.at(-1)?.gapMinutesFromPrevious).toBe(2880);
    expect(third.items.map((item) => item.tweetId)).toEqual(["1003", "1002"]);
    expect(last.items.map((item) => item.tweetId)).toEqual(["1001"]);
    expect(last.items[0].gapMinutesFromPrevious).toBeNull();
    expect(last.nextCursor).toBeNull();
  });

  it("resumes by timestamp and ID after the cursor record is removed", () => {
    const instant = "2026-11-26T12:00:00.000Z";
    const resets = [makeReset("1003", instant), makeReset("1001", instant)];
    const next = paginateResetFeed(resets, 2, { tweetId: "1002", resetAt: instant });

    expect(next.items.map((item) => item.tweetId)).toEqual(["1001"]);
    expect(paginateResetFeed(resets, 2, { tweetId: "1001", resetAt: instant }).items).toEqual([]);
  });
});

describe("computeHeroState", () => {
  const now = new Date("2026-11-26T12:00:00.000Z");

  it("returns empty when there is no reset timestamp or invalid timestamp", () => {
    expect(computeHeroState(null, now)).toBe("empty");
    expect(computeHeroState(undefined, now)).toBe("empty");
    expect(computeHeroState("not-a-date", now)).toBe("empty");
  });

  it("returns reset_recently when less than 24 hours elapsed", () => {
    expect(computeHeroState("2026-11-25T12:00:01.000Z", now)).toBe(
      "reset_recently",
    );
    expect(computeHeroState("2026-11-26T11:00:00.000Z", now)).toBe(
      "reset_recently",
    );
  });

  it("returns waiting at exactly 24 hours or more", () => {
    expect(computeHeroState("2026-11-25T12:00:00.000Z", now)).toBe("waiting");
    expect(computeHeroState("2026-11-20T12:00:00.000Z", now)).toBe("waiting");
  });
});

describe("computeMetrics", () => {
  const now = new Date("2026-11-26T12:00:00.000Z");

  it("handles empty resets safely without NaN", () => {
    expect(computeMetrics([], now)).toEqual({
      total: 0,
      avgIntervalDays: null,
      longestWaitDays: null,
    });
  });

  it("handles a single reset by returning null avgIntervalDays and current wait", () => {
    const resets = [makeReset("1001", "2026-11-23T00:00:00.000Z")];

    expect(computeMetrics(resets, now)).toEqual({
      total: 1,
      avgIntervalDays: null,
      longestWaitDays: 3.5,
    });
  });

  it("computes average interval and compares historical gaps vs current wait without mutating input", () => {
    const resets = [
      makeReset("1003", "2026-11-24T12:00:00.000Z"),
      makeReset("1001", "2026-11-01T12:00:00.000Z"),
      makeReset("1002", "2026-11-11T12:00:00.000Z"),
    ];
    const snapshotIds = resets.map((r) => r.tweetId);

    // Gaps: 10d and 13d -> avg 11.5d; current wait = 2.0d -> longest = 13.0d
    expect(computeMetrics(resets, now)).toEqual({
      total: 3,
      avgIntervalDays: 11.5,
      longestWaitDays: 13,
    });
    expect(resets.map((r) => r.tweetId)).toEqual(snapshotIds);
  });

  it("uses ongoing wait as longestWaitDays when longer than past intervals", () => {
    const resets = [
      makeReset("1001", "2026-11-01T12:00:00.000Z"),
      makeReset("1002", "2026-11-06T12:00:00.000Z"),
    ];

    // Gap: 5d; ongoing wait: 20d -> longest = 20d
    expect(computeMetrics(resets, now)).toEqual({
      total: 2,
      avgIntervalDays: 5,
      longestWaitDays: 20,
    });
  });
});

describe("sortResetsDescending & computeFeedIntervals", () => {
  it("sorts descending and attaches a gap in minutes except for the oldest item", () => {
    const resets = [
      makeReset("1001", "2026-11-01T12:00:00.000Z"),
      makeReset("1003", "2026-11-20T00:00:00.000Z"),
      makeReset("1002", "2026-11-10T12:00:00.000Z"),
    ];

    const sorted = sortResetsDescending(resets);
    expect(sorted.map((r) => r.tweetId)).toEqual(["1003", "1002", "1001"]);

    const feed = computeFeedIntervals(resets);
    expect(feed.map((item) => item.gapMinutesFromPrevious)).toEqual([
      13680,
      12960,
      null,
    ]);
  });

  it("matches the displayed clock minutes without rounding gaps up to full days", () => {
    const resets = [
      makeReset("1004", "2026-11-26T15:19:03+08:00"),
      makeReset("1003", "2026-11-24T04:16:52+08:00"),
      makeReset("1002", "2026-11-21T17:18:28+08:00"),
      makeReset("1001", "2026-11-18T07:38:17+08:00"),
    ];

    expect(computeFeedIntervals(resets).map((item) => item.gapMinutesFromPrevious))
      .toEqual([3543, 3538, 4900, null]);
  });
});
