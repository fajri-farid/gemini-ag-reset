import { describe, expect, it } from "vitest";
import type { PublicTrackerPayload, ResetRecord } from "@/lib/types";
import { buildShareCardViewModel } from "../share-card-data";

function makeReset(tweetId: string, resetAt: string, tweetText: string): ResetRecord {
  return {
    tweetId,
    tweetUrl: `https://x.com/_mohansolo/status/${tweetId}`,
    tweetText,
    summary: tweetText,
    confidence: 0.96,
    source: "auto",
    resetAt,
    createdAt: resetAt,
    updatedAt: resetAt,
  };
}

const FIXTURE_PAYLOAD: PublicTrackerPayload = {
  resets: [
    makeReset(
      "1860000000000000302",
      "2026-11-27T04:00:00.000Z",
      "Resetting Gemini quota across Antigravity right now!",
    ),
    makeReset(
      "1860000000000000201",
      "2026-11-21T16:00:00.000Z",
      "Fresh Gemini quota reset is live.",
    ),
  ],
  metrics: {
    total: 2,
    avgIntervalDays: 5.5,
    longestWaitDays: 5.5,
  },
  heroState: "reset_recently",
  syncStatus: {
    lastCheckedAt: "2026-11-27T04:30:00.000Z",
    lastStatus: "ok",
    trackingStartedAt: "2026-10-15T00:00:00.000Z",
  },
  generatedAt: "2026-11-27T05:00:00.000Z",
};

describe("buildShareCardViewModel", () => {
  it("projects hero reset, 8-week mini heatmap, and highlighted date key", () => {
    const viewModel = buildShareCardViewModel(FIXTURE_PAYLOAD, {
      locale: "en",
      timeZone: "America/Los_Angeles",
      now: new Date("2026-11-27T06:00:00.000Z"),
    });

    expect(viewModel).not.toBeNull();
    expect(viewModel?.mode).toBe("hero");
    expect(viewModel?.reset?.tweetId).toBe("1860000000000000302");
    expect(viewModel?.miniHeatmap.weeks).toHaveLength(8);
    expect(viewModel?.highlightedDateKey).toBe("2026-11-26");
    expect(viewModel?.gapLabel).toContain("apart");
  });

  it("projects an older historical reset when tweetId matches and returns null if unknown", () => {
    const found = buildShareCardViewModel(FIXTURE_PAYLOAD, {
      tweetId: "1860000000000000201",
      locale: "id",
      timeZone: "Asia/Makassar",
      now: new Date("2026-11-27T06:00:00.000Z"),
    });

    expect(found).not.toBeNull();
    expect(found?.mode).toBe("item");
    expect(found?.reset?.tweetId).toBe("1860000000000000201");
    expect(found?.heroState).toBe("waiting");
    expect(found?.highlightedDateKey).toBe("2026-11-22");

    const missing = buildShareCardViewModel(FIXTURE_PAYLOAD, {
      tweetId: "9999999999999999999",
      locale: "en",
      timeZone: "America/Los_Angeles",
    });
    expect(missing).toBeNull();
  });
});
