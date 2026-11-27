import { describe, expect, it } from "vitest";
import { buildShareCopyBundle, truncateTweetSnippet } from "../share-templates";
import type { ResetEvidence, TrackerMetrics } from "../types";

const SAMPLE_RESET: ResetEvidence = {
  tweetId: "1860000000000000302",
  tweetUrl: "https://x.com/_mohansolo/status/1860000000000000302",
  tweetText:
    "Just reset Gemini quota limits for everyone on Antigravity!\n\nHappy coding 🚀",
  resetAt: "2026-11-27T04:00:00.000Z",
};

const SAMPLE_METRICS: TrackerMetrics = {
  total: 12,
  avgIntervalDays: 5.2,
  longestWaitDays: 11.4,
};

const SITE_URL = "https://resets.example.com";

describe("share-templates bilingual copy generator", () => {
  it("truncates long tweets cleanly without breaking single-line spacing", () => {
    const longText = "word ".repeat(50);
    const snippet = truncateTweetSnippet(longText, 40);
    expect(snippet.length).toBeLessThanOrEqual(40);
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("builds EN fresh (< 5h) reset announcement copy with canonical URL", () => {
    const bundle = buildShareCopyBundle({
      mode: "hero",
      heroState: "reset_recently",
      reset: SAMPLE_RESET,
      metrics: SAMPLE_METRICS,
      locale: "en",
      timeZone: "America/Los_Angeles",
      now: new Date("2026-11-27T06:00:00.000Z"), // 2h ago (< 5h)
      siteOrigin: SITE_URL,
    });

    expect(bundle.whatsappText).toContain(
      "*Gemini quota in Antigravity just reset!*",
    );
    expect(bundle.whatsappText).toContain(SAMPLE_RESET.tweetUrl);
    expect(bundle.whatsappText).toContain(SITE_URL);
    expect(new URL(bundle.whatsappUrl).searchParams.get("text")).toBe(
      bundle.whatsappText,
    );
    expect(bundle.socialText).toBe(`${bundle.socialCaption}\n${SITE_URL}`);
    expect(bundle.nativeShareText).toBe(bundle.socialCaption);
    expect(bundle.siteUrl).toBe(SITE_URL);
    const xIntent = new URL(bundle.xIntentUrl);
    expect(xIntent.searchParams.get("text")).toBe(bundle.socialCaption);
    expect(xIntent.searchParams.get("url")).toBe(SITE_URL);
    const threadsIntent = new URL(bundle.threadsIntentUrl);
    expect(threadsIntent.origin).toBe("https://www.threads.com");
    expect(threadsIntent.pathname).toBe("/intent/post");
    expect(threadsIntent.searchParams.get("text")).toBe(bundle.socialText);
  });

  it("switches to web overview copy once >= 5h have passed even if heroState is reset_recently", () => {
    const bundle = buildShareCopyBundle({
      mode: "hero",
      heroState: "reset_recently",
      reset: SAMPLE_RESET,
      metrics: SAMPLE_METRICS,
      locale: "id",
      timeZone: "Asia/Makassar",
      now: new Date("2026-11-27T09:00:00.000Z"), // Exactly 5h ago
      siteOrigin: SITE_URL,
    });

    expect(bundle.whatsappText).toContain(
      "*Kapan kuota Gemini di Antigravity terakhir di-reset?*",
    );
    expect(bundle.whatsappText).toContain("Rata-rata jeda: 5.2 hr");
    expect(bundle.whatsappText).toContain("Jeda terlama: 11.4 hr");
    expect(bundle.socialText).toContain("Reset terakhir tercatat");
    expect(bundle.socialText).toContain(SITE_URL);
    expect(new URL(bundle.threadsIntentUrl).searchParams.get("text")).toBe(
      bundle.socialText,
    );
  });

  it("builds archive item copy for historical announcements", () => {
    const bundle = buildShareCopyBundle({
      mode: "item",
      heroState: "reset_recently",
      reset: SAMPLE_RESET,
      metrics: SAMPLE_METRICS,
      locale: "id",
      timeZone: "America/Los_Angeles",
      now: new Date("2026-11-27T06:00:00.000Z"),
      siteOrigin: SITE_URL,
    });

    expect(bundle.whatsappText).toContain("*Arsip reset kuota Gemini di Antigravity*");
    expect(bundle.whatsappText).toContain(SAMPLE_RESET.tweetUrl);
    expect(bundle.socialText).toContain(SAMPLE_RESET.tweetUrl);
    expect(bundle.socialText).toContain(SITE_URL);
  });
});
