import { describe, expect, it } from "vitest";
import type { PublicTrackerPayload } from "@/lib/types";
import { buildShareCardViewModel } from "../share-card-data";
import { renderOgShareImage } from "../share-card-renderer";

const BASE_PAYLOAD: PublicTrackerPayload = {
  resets: [
    {
      tweetId: "1860000000000000302",
      tweetUrl: "https://x.com/_mohansolo/status/1860000000000000302",
      tweetText:
        "Just rolled out a fresh Gemini quota reset across Antigravity! Enjoy building.",
      summary: "Fresh Gemini quota reset.",
      confidence: 0.97,
      source: "auto",
      resetAt: "2026-11-27T04:00:00.000Z",
      createdAt: "2026-11-27T04:05:00.000Z",
      updatedAt: "2026-11-27T04:05:00.000Z",
    },
    {
      tweetId: "1860000000000000201",
      tweetUrl: "https://x.com/_mohansolo/status/1860000000000000201",
      tweetText: "Previous Gemini quota reset announcement.",
      summary: "Previous reset.",
      confidence: 0.94,
      source: "auto",
      resetAt: "2026-11-21T16:00:00.000Z",
      createdAt: "2026-11-21T16:05:00.000Z",
      updatedAt: "2026-11-21T16:05:00.000Z",
    },
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

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("renderOgShareImage (1200x630)", () => {
  it("renders valid 1200x630 PNG in fresh (< 5h) reset announcement state", async () => {
    const viewModel = buildShareCardViewModel(BASE_PAYLOAD, {
      locale: "en",
      timeZone: "America/Los_Angeles",
      now: new Date("2026-11-27T06:00:00.000Z"),
    });
    expect(viewModel).not.toBeNull();

    const response = await renderOgShareImage(viewModel!);
    expect(response.status).toBe(200);
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(readPngDimensions(buffer)).toEqual({ width: 1200, height: 630 });
  });

  it("renders valid 1200x630 PNG in web overview (>= 5h) state", async () => {
    const overviewPayload: PublicTrackerPayload = {
      ...BASE_PAYLOAD,
      heroState: "waiting",
      generatedAt: "2026-12-03T06:00:00.000Z",
    };
    const viewModel = buildShareCardViewModel(overviewPayload, {
      locale: "en",
      timeZone: "America/Los_Angeles",
      now: new Date("2026-12-03T06:00:00.000Z"),
    });
    expect(viewModel).not.toBeNull();

    const response = await renderOgShareImage(viewModel!);
    expect(response.status).toBe(200);
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(readPngDimensions(buffer)).toEqual({ width: 1200, height: 630 });
  });
});
