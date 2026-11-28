import { describe, expect, it } from "vitest";
import {
  buildResetPushPayload,
  buildTestPushPayload,
  isValidPushEndpoint,
} from "@/lib/push";

describe("isValidPushEndpoint", () => {
  it("accepts standard HTTPS browser push endpoints", () => {
    expect(
      isValidPushEndpoint(
        "https://fcm.googleapis.com/fcm/send/abc123_def456",
      ),
    ).toBe(true);
    expect(
      isValidPushEndpoint(
        "https://updates.push.services.mozilla.com/wpush/v2/token",
      ),
    ).toBe(true);
    expect(isValidPushEndpoint("https://web.push.apple.com/token")).toBe(true);
    expect(isValidPushEndpoint("https://wns1.notify.windows.com/token")).toBe(true);
  });

  it("rejects non-HTTPS, localhost, IP literals, and credentialed URLs", () => {
    expect(isValidPushEndpoint("http://fcm.googleapis.com/fcm/send/123")).toBe(
      false,
    );
    expect(isValidPushEndpoint("https://localhost:3000/push")).toBe(false);
    expect(isValidPushEndpoint("https://127.0.0.1/push")).toBe(false);
    expect(isValidPushEndpoint("https://[::1]/push")).toBe(false);
    expect(isValidPushEndpoint("https://user:pass@example.com/push")).toBe(
      false,
    );
    expect(isValidPushEndpoint("not-a-url")).toBe(false);
    expect(isValidPushEndpoint("https://push.example.test/token")).toBe(false);
    expect(isValidPushEndpoint("https://fcm.googleapis.com:8443/token")).toBe(false);
    expect(isValidPushEndpoint("https://fcm.googleapis.com.example.test/token")).toBe(false);
    expect(isValidPushEndpoint("https://fakepush.apple.com/token")).toBe(false);
    expect(isValidPushEndpoint("https://fcm.googleapis.com/token#fragment")).toBe(false);
  });
});

describe("buildResetPushPayload & buildTestPushPayload", () => {
  it("builds the English reset notification and assigns a tag per tweet", () => {
    const payload = buildResetPushPayload(
      {
        tweetId: "1890000000000000001",
        summary: "Quota reset for all Antigravity Gemini users.",
        tweetText: "Full tweet body",
      },
      "en",
    );

    expect(payload.title).toContain("Gemini quota just reset");
    expect(payload.body).toBe("Quota reset for all Antigravity Gemini users.");
    expect(payload.tag).toBe("gemini-reset-1890000000000000001");
  });

  it("builds Indonesian reset notification and falls back to tweetText when summary is absent", () => {
    const payload = buildResetPushPayload(
      {
        tweetId: "1890000000000000002",
        summary: null,
        tweetText: "We just reset Gemini quotas across Antigravity.",
      },
      "id",
    );

    expect(payload.title).toContain("Kuota Gemini baru saja reset");
    expect(payload.body).toBe(
      "We just reset Gemini quotas across Antigravity.",
    );
  });

  it("builds realistic preview payloads for EN and ID matching real reset format", () => {
    const enFallback = buildTestPushPayload("en");
    const idWithLatest = buildTestPushPayload(
      "id",
      {
        tweetId: "1890000000000000099",
        summary: "Kuota Gemini di Antigravity baru saja direset.",
        tweetText: "Full tweet",
      },
    );

    expect(enFallback.tag).toBe("gemini-reset-preview");
    expect(enFallback.title).toContain("Gemini quota just reset");
    expect(enFallback.body).toContain("Antigravity");
    expect(idWithLatest.tag).toBe("gemini-reset-preview");
    expect(idWithLatest.title).toContain("Kuota Gemini baru saja reset");
    expect(idWithLatest.body).toBe(
      "Kuota Gemini di Antigravity baru saja direset.",
    );
  });
});
