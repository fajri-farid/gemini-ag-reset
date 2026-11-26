import { describe, expect, it } from "vitest";
import { buildDynamicHeatmap } from "../heatmap";
import type { ResetRecord } from "../types";

function makeReset(tweetId: string, resetAt: string): ResetRecord {
  return {
    tweetId,
    tweetUrl: `https://x.com/_mohansolo/status/${tweetId}`,
    tweetText: `Reset ${tweetId}`,
    summary: null,
    confidence: 0.95,
    source: "auto",
    resetAt,
    createdAt: resetAt,
    updatedAt: resetAt,
  };
}

describe("buildDynamicHeatmap", () => {
  it("renders a full 52-week grid while distinguishing days before trackingStartedAt and future days", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    const resets = [
      makeReset("1001", "2026-11-05T18:00:00.000Z"),
      makeReset("1002", "2026-11-20T18:00:00.000Z"),
    ];

    const heatmap = buildDynamicHeatmap({
      resets,
      trackingStartedAt: "2026-11-01T00:00:00.000Z",
      timeZone: "UTC",
      locale: "en",
      now,
    });

    expect(heatmap.trackingStartKey).toBe("2026-11-01");
    expect(heatmap.rangeEndKey).toBe("2026-11-29");
    expect(heatmap.totalWeeks).toBe(52);
    expect(heatmap.weeks).toHaveLength(52);
    expect(heatmap.totalResetDays).toBe(2);
    expect(heatmap.weeks[0].cells).toHaveLength(7);

    const allCells = heatmap.weeks.flatMap((w) => w.cells);
    const beforeTracking = allCells.find((c) => c.dateKey === "2026-10-31");
    const inTracking = allCells.find((c) => c.dateKey === "2026-11-10");
    const futureCell = allCells.find((c) => c.dateKey === "2026-11-28");

    expect(beforeTracking?.inTrackingRange).toBe(false);
    expect(beforeTracking?.isFuture).toBe(false);
    expect(inTracking?.inTrackingRange).toBe(true);
    expect(inTracking?.isFuture).toBe(false);
    expect(futureCell?.isFuture).toBe(true);
    expect(futureCell?.inTrackingRange).toBe(false);
  });

  it("caps dynamic range at maxWeeks (52 weeks) for history older than 1 year", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    const resets = [makeReset("1000", "2025-01-10T12:00:00.000Z")];

    const heatmap = buildDynamicHeatmap({
      resets,
      trackingStartedAt: "2025-01-01T00:00:00.000Z",
      timeZone: "UTC",
      now,
    });

    expect(heatmap.totalWeeks).toBe(52);
    expect(heatmap.weeks).toHaveLength(52);
  });

  it("shifts reset day key accurately across Varun PT vs local Asia/Makassar timezones", () => {
    // 2026-11-26T04:00:00Z = Nov 25 20:00 PST (Varun time) = Nov 26 12:00 WITA (Asia/Makassar)
    const now = new Date("2026-11-26T14:00:00.000Z");
    const resets = [makeReset("2001", "2026-11-26T04:00:00.000Z")];

    const varunMap = buildDynamicHeatmap({
      resets,
      trackingStartedAt: "2026-11-20T00:00:00.000Z",
      timeZone: "America/Los_Angeles",
      now,
    });
    const localMap = buildDynamicHeatmap({
      resets,
      trackingStartedAt: "2026-11-20T00:00:00.000Z",
      timeZone: "Asia/Makassar",
      now,
    });

    const varunResetDays = varunMap.weeks
      .flatMap((w) => w.cells)
      .filter((c) => c.hasReset)
      .map((c) => c.dateKey);
    const localResetDays = localMap.weeks
      .flatMap((w) => w.cells)
      .filter((c) => c.hasReset)
      .map((c) => c.dateKey);

    expect(varunResetDays).toEqual(["2026-11-25"]);
    expect(localResetDays).toEqual(["2026-11-26"]);
  });

  it("groups multiple resets on the same day into one cell and pulls trackingStartKey to earliest reset", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    const resets = [
      makeReset("3001", "2026-11-10T09:00:00.000Z"),
      makeReset("3002", "2026-11-10T21:00:00.000Z"),
    ];

    const heatmap = buildDynamicHeatmap({
      resets,
      trackingStartedAt: "2026-11-15T00:00:00.000Z",
      timeZone: "UTC",
      now,
    });

    expect(heatmap.trackingStartKey).toBe("2026-11-10");
    expect(heatmap.totalResetDays).toBe(1);

    const cell = heatmap.weeks
      .flatMap((w) => w.cells)
      .find((c) => c.dateKey === "2026-11-10");

    expect(cell?.hasReset).toBe(true);
    expect(cell?.resets.map((r) => r.tweetId)).toEqual(["3002", "3001"]);
  });
});
