import { describe, expect, it } from "vitest";
import {
  computeWaitingBarProgress,
  formatCompactTweetAge,
  STORY_SAFE_ZONES,
  wrapTextLines,
} from "../share-card-layout";

describe("share-card-layout helpers", () => {
  it("keeps 9:16 Instagram Story / WA Status safe zones within bounds", () => {
    expect(STORY_SAFE_ZONES.top).toBe(240);
    expect(STORY_SAFE_ZONES.bottom).toBe(300);
    expect(STORY_SAFE_ZONES.contentBottom - STORY_SAFE_ZONES.contentTop).toBe(
      1380,
    );
  });

  it("wraps multi-paragraph text and appends ellipsis cleanly when overflowing", () => {
    const lines = wrapTextLines(
      "Very cool to see so many new users using Antigravity!\n\nQuota reset is live right now for everyone.",
      3,
      24,
      (candidate) => candidate.length,
    );

    expect(lines).toHaveLength(3);
    expect(lines[2]?.endsWith("…")).toBe(true);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(24);
    }
  });

  it("computes clamped waiting bar ratios against avg and record wait", () => {
    const progress = computeWaitingBarProgress(
      "2026-11-21T00:00:00.000Z",
      { total: 10, avgIntervalDays: 5, longestWaitDays: 12 },
      new Date("2026-11-27T00:00:00.000Z"),
    );

    expect(progress.currentWaitDays).toBe(6);
    expect(progress.maxScaleDays).toBe(12);
    expect(progress.currentRatio).toBeCloseTo(0.5, 2);
    expect(progress.avgRatio).toBeCloseTo(5 / 12, 2);
  });

  it("formats compact X-style relative age for EN and ID", () => {
    const now = new Date("2026-11-27T12:00:00.000Z");
    expect(formatCompactTweetAge("2026-11-27T06:00:00.000Z", "en", now)).toBe(
      "6h",
    );
    expect(formatCompactTweetAge("2026-11-27T06:00:00.000Z", "id", now)).toBe(
      "6j",
    );
    expect(formatCompactTweetAge("2026-11-22T12:00:00.000Z", "en", now)).toBe(
      "5d",
    );
  });
});
