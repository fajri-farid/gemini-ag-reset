import { createECDH, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { PushNotificationPayload, StoredPushSubscription } from "@/lib/push";
import { nextPushPage } from "@/lib/server/push-outbox";
import { readPushRequest, subscribeRequestSchema, unsubscribeSchema, validVapidKeys } from "@/lib/server/push-request";
import { hashPushEndpoint, sendResetPushPage, sendTestPushToSubscription } from "@/lib/server/push-service";

const keyPair = createECDH("prime256v1");
keyPair.generateKeys();
const keys = {
  p256dh: keyPair.getPublicKey().toString("base64url"),
  auth: randomBytes(16).toString("base64url"),
};
const reset = { tweetId: "1890000000000000011", summary: "Quota reset!", tweetText: "Full text" };

function recipient(id: string, locale: "en" | "id" = "en"): StoredPushSubscription {
  const endpoint = `https://fcm.googleapis.com/fcm/send/${id}`;
  return { id, endpoint, keys, locale, createdAt: "", updatedAt: "" };
}

function request(body: string, headers?: Record<string, string>) {
  return new NextRequest("https://tracker.example/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("push requests", () => {
  it("validates subscription keys and requires proof to unsubscribe", async () => {
    const input = recipient("one");
    expect(subscribeRequestSchema.safeParse(input).success).toBe(true);
    expect(subscribeRequestSchema.safeParse({ ...input, keys: { ...keys, auth: "a".repeat(22) } }).success).toBe(false);
    expect(subscribeRequestSchema.safeParse({ ...input, keys: { ...keys, p256dh: Buffer.alloc(65, 4).toString("base64url") } }).success).toBe(false);
    expect(unsubscribeSchema.safeParse({ endpoint: input.endpoint }).success).toBe(false);
    expect(unsubscribeSchema.safeParse({ endpoint: input.endpoint, auth: keys.auth }).success).toBe(true);
  });

  it("rejects oversized, non-JSON and cross-origin browser requests", async () => {
    const oversized = await readPushRequest(request(JSON.stringify("x".repeat(4100))), subscribeRequestSchema);
    const wrongType = await readPushRequest(request("{}", { "Content-Type": "text/plain" }), subscribeRequestSchema);
    const crossOrigin = await readPushRequest(request("{}", { Origin: "https://example.test" }), subscribeRequestSchema);
    expect("response" in oversized && oversized.response.status).toBe(413);
    expect("response" in wrongType && wrongType.response.status).toBe(415);
    expect("response" in crossOrigin && crossOrigin.response.status).toBe(403);
  });

  it("requires a matching VAPID key pair", () => {
    const otherPair = createECDH("prime256v1");
    otherPair.generateKeys();
    const encodePrivate = (key: ReturnType<typeof createECDH>) =>
      key.getPrivateKey("hex").padStart(64, "0");
    expect(validVapidKeys(keys.p256dh, Buffer.from(encodePrivate(keyPair), "hex").toString("base64url"))).toBe(true);
    expect(validVapidKeys(keys.p256dh, Buffer.from(encodePrivate(otherPair), "hex").toString("base64url"))).toBe(false);
  });
});

describe("push delivery", () => {
  it("hashes trimmed endpoints consistently", () => {
    const { endpoint } = recipient("one");
    expect(hashPushEndpoint(endpoint)).toHaveLength(64);
    expect(hashPushEndpoint(` ${endpoint} `)).toBe(hashPushEndpoint(endpoint));
  });

  it("localizes deliveries and separates expired, permanent and transient results", async () => {
    const accepted: PushNotificationPayload[] = [];
    const recipients = [
      recipient("en"),
      recipient("id", "id"),
      recipient("expired-404"),
      recipient("expired-410"),
      recipient("retry-429"),
      recipient("retry-503"),
      recipient("permanent-403"),
    ];
    const result = await sendResetPushPage(reset, recipients, {
      async send(subscription, payload) {
        const status = Number(subscription.endpoint.match(/-(\d+)$/)?.[1]);
        if (status) throw Object.assign(new Error("Mock push status"), { statusCode: status });
        accepted.push(payload);
      },
    });
    expect(result.accepted).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.expired.map(({ id }) => id)).toEqual(["expired-404", "expired-410"]);
    expect(result.retryIds).toEqual(["retry-429", "retry-503"]);
    expect(accepted[0].title).toContain("Gemini quota just reset");
    expect(accepted[1].title).toContain("Kuota Gemini baru saja reset");
  });

  it("persists the page cursor and retries only failed recipients up to three attempts", () => {
    const page = { nextCursor: "two", hasMore: true };
    const pending = nextPushPage({ attempt: 0 }, page, ["one"], 0);
    expect(pending).toEqual({ done: false, failed: 0, cursor: "two", retryIds: ["one"], attempt: 1, dueAt: 60_000 });
    const exhausted = nextPushPage({ attempt: 2 }, page, ["one"], 60_000);
    expect(exhausted).toEqual({ done: false, failed: 1, cursor: "two", retryIds: [], attempt: 0, dueAt: 60_000 });
    expect(nextPushPage({ attempt: 0 }, { ...page, hasMore: false }, [], 0).done).toBe(true);
  });

  it("sends a preview only to the supplied browser with the real reset format", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const browser = recipient("demo", "id");
    await sendTestPushToSubscription(browser, {
      sender: { send },
      latestReset: { ...reset, summary: "Kuota Gemini di Antigravity baru saja direset." },
    });
    expect(send).toHaveBeenCalledExactlyOnceWith(browser, expect.objectContaining({
      tag: "gemini-reset-preview",
      title: expect.stringContaining("Kuota Gemini baru saja reset"),
      body: "Kuota Gemini di Antigravity baru saja direset.",
    }));
  });
});
