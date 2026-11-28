import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const endpoint = "https://fcm.googleapis.com/fcm/send/browser";
const keys = { p256dh: "browser-public-key", auth: "browser-auth" };
const browserSubscription = {
  endpoint,
  toJSON: () => ({ endpoint, keys }),
  unsubscribe: vi.fn(),
};
const pushManager = {
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
};
const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AQ");
  const registration = { pushManager };
  vi.stubGlobal("window", {
    isSecureContext: true,
    PushManager: {},
    Notification: {},
    atob,
    setTimeout,
    clearTimeout,
  });
  vi.stubGlobal("navigator", {
    userAgent: "Test",
    serviceWorker: {
      ready: Promise.resolve(registration),
      register: vi.fn().mockResolvedValue(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
    },
  });
  vi.stubGlobal("Notification", { permission: "granted" });
  vi.stubGlobal("fetch", fetchMock);
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  pushManager.getSubscription.mockResolvedValue(browserSubscription);
  pushManager.subscribe.mockResolvedValue(browserSubscription);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("browser subscription state", () => {
  it("asks the browser synchronously on click and waits for server confirmation", async () => {
    const client = await import("@/lib/push-client");
    await client.prepareBrowserPush();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    const enabling = client.subscribeBrowserToPush("en");
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    await expect(enabling).rejects.toThrow("PUSH_REQUEST_FAILED");

    fetchMock.mockResolvedValueOnce(Response.json({ active: false }));
    expect(await client.syncExistingBrowserPush("id")).toBe(false);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({ body: JSON.stringify({ endpoint, keys, locale: "id", existingOnly: true }) }),
    );
  });

  it("keeps the browser subscription available to retry when the server rejects unsubscribe", async () => {
    const client = await import("@/lib/push-client");
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(client.unsubscribeBrowserFromPush()).rejects.toThrow("PUSH_REQUEST_FAILED");
    expect(client.isPushDisablePending()).toBe(true);
    expect(browserSubscription.unsubscribe).not.toHaveBeenCalled();
    expect(await client.syncExistingBrowserPush("en")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not report a successful unsubscribe while the browser still has a subscription", async () => {
    const client = await import("@/lib/push-client");
    fetchMock.mockImplementation(async () => Response.json({ ok: true }));
    browserSubscription.unsubscribe.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(client.unsubscribeBrowserFromPush()).rejects.toThrow("PUSH_UNSUBSCRIBE_FAILED");
    expect(client.isPushDisablePending()).toBe(true);
    await client.unsubscribeBrowserFromPush();
    expect(client.isPushDisablePending()).toBe(false);
  });
});

it("opens the same-origin home from a push and uses neutral text if the payload is empty", async () => {
  const origin = "https://tracker.example";
  const handlers = new Map<string, (event: unknown) => void>();
  const focus = vi.fn();
  const openWindow = vi.fn();
  const showNotification = vi.fn();
  const self = {
    location: { origin },
    clients: { matchAll: async () => [{ url: origin + "/admin", focus }], openWindow },
    registration: { showNotification },
    addEventListener: (name: string, listener: (event: unknown) => void) => handlers.set(name, listener),
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), { self, URL });
  const callback = vi.fn();
  handlers.get("notificationclick")?.({
    notification: { close: vi.fn(), data: { url: "https://other.example/" } },
    waitUntil: callback,
  });
  await callback.mock.calls[0][0];
  expect(focus).not.toHaveBeenCalled();
  expect(openWindow).toHaveBeenCalledWith(origin + "/");
  handlers.get("push")?.({ waitUntil: vi.fn() });
  expect(showNotification).toHaveBeenCalledWith(
    "Gemini Resets",
    expect.objectContaining({ body: "Open Gemini Resets to see the latest updates." }),
  );
});
