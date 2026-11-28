import { urlBase64ToUint8Array, type PushSubscriptionKeys } from "@/lib/push";
import type { Locale } from "@/lib/types";

export interface SerializedPushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

const DISABLE_PENDING_KEY = "gemini-reset-push-disable-pending";
let disablePending = false;
let pushRegistration: ServiceWorkerRegistration | null = null;
let preparingRegistration: Promise<void> | null = null;
let existingSync: Promise<unknown> = Promise.resolve();

export function isPushDisablePending(): boolean {
  try {
    return localStorage.getItem(DISABLE_PENDING_KEY) === "1";
  } catch {
    return disablePending;
  }
}

function setPushDisablePending(value: boolean) {
  disablePending = value;
  try {
    if (value) localStorage.setItem(DISABLE_PENDING_KEY, "1");
    else localStorage.removeItem(DISABLE_PENDING_KEY);
  } catch {
    // The current tab can still finish the change if storage is disabled.
  }
}

export function getVapidPublicKey(): string {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
}

export function isPushSupportedInBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosNeedsInstall(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIosDevice) {
    return false;
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return !isStandalone;
}

export function serializePushSubscription(
  subscription: PushSubscription,
): SerializedPushSubscription | null {
  const json = subscription.toJSON();
  const endpoint = json.endpoint?.trim();
  const p256dh = json.keys?.p256dh?.trim();
  const auth = json.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    keys: { p256dh, auth },
  };
}

export function prepareBrowserPush(): Promise<void> {
  if (pushRegistration || !getVapidPublicKey() || !isPushSupportedInBrowser() || isIosNeedsInstall()) {
    return Promise.resolve();
  }
  preparingRegistration ??= (async () => {
    let timeout: number | undefined;
    try {
      pushRegistration = await Promise.race([
        navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
          .then(() => navigator.serviceWorker.ready),
        new Promise<never>((_, reject) => {
          timeout = window.setTimeout(() => reject(new Error("PUSH_NOT_READY")), 8000);
        }),
      ]);
    } finally {
      window.clearTimeout(timeout);
      preparingRegistration = null;
    }
  })();
  return preparingRegistration;
}

export async function getCurrentBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupportedInBrowser()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

export async function createBrowserPushSubscription(): Promise<SerializedPushSubscription> {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    throw new Error("PUSH_UNCONFIGURED");
  }

  if (isIosNeedsInstall()) {
    throw new Error("IOS_INSTALL_REQUIRED");
  }

  if (!isPushSupportedInBrowser()) {
    throw new Error("PUSH_UNSUPPORTED");
  }

  if (Notification.permission === "denied") throw new Error("PERMISSION_DENIED");
  if (!pushRegistration) throw new Error("PUSH_NOT_READY");

  // This can show the permission prompt. Call it directly from the click.
  const subscription = await pushRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  }).catch((error: unknown) => {
    if (Notification.permission === "denied") throw new Error("PERMISSION_DENIED");
    throw error;
  });
  const serialized = serializePushSubscription(subscription);
  if (!serialized) {
    throw new Error("INVALID_SUBSCRIPTION");
  }
  return serialized;
}

async function postPush(path: "subscribe" | "unsubscribe", data: object) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`/api/push/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("PUSH_REQUEST_FAILED");
    return await response.json() as { active?: boolean };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function subscribeBrowserToPush(locale: Locale): Promise<void> {
  const serialized = await createBrowserPushSubscription();
  const response = await postPush("subscribe", { ...serialized, locale });
  if (!response.active) throw new Error("PUSH_REQUEST_FAILED");
}

export function syncExistingBrowserPush(locale: Locale): Promise<boolean> {
  const sync = existingSync.then(async () => {
    if (isPushDisablePending() || isIosNeedsInstall()) return false;
    const subscription = await getCurrentBrowserPushSubscription();
    const serialized = subscription && serializePushSubscription(subscription);
    if (!serialized || isPushDisablePending()) return false;
    const response = await postPush("subscribe", { ...serialized, locale, existingOnly: true });
    return response.active === true && !isPushDisablePending();
  });
  existingSync = sync.catch(() => undefined);
  return sync;
}

export async function unsubscribeBrowserFromPush(): Promise<void> {
  setPushDisablePending(true);
  const subscription = await getCurrentBrowserPushSubscription();
  if (subscription) {
    const serialized = serializePushSubscription(subscription);
    if (!serialized) throw new Error("INVALID_SUBSCRIPTION");
    await postPush("unsubscribe", { endpoint: serialized.endpoint, auth: serialized.keys.auth });
    if (!await subscription.unsubscribe() && await getCurrentBrowserPushSubscription()) {
      throw new Error("PUSH_UNSUBSCRIBE_FAILED");
    }
  }
  setPushDisablePending(false);
}
