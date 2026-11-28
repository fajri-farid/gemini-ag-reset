import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/types";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: PushSubscriptionKeys;
  locale: Locale;
}

export interface StoredPushSubscription extends PushSubscriptionInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  tag: string;
}

export function isValidPushEndpoint(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("https://") || trimmed.length > 2048 || /[\s\\#]/.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" || parsed.port || parsed.username ||
        parsed.password || parsed.pathname === "/") {
      return false;
    }
    const host = parsed.hostname;
    return host === "fcm.googleapis.com" || host === "android.googleapis.com" ||
      host === "updates.push.services.mozilla.com" || host === "push.services.mozilla.com" ||
      host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function truncateText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function buildResetPushPayload(
  reset: { tweetId: string; summary?: string | null; tweetText: string },
  locale: Locale,
): PushNotificationPayload {
  const snippet = truncateText(
    reset.summary?.trim() || reset.tweetText.trim(),
    140,
  );

  if (locale === "id") {
    return {
      title: `${siteConfig.name} — Kuota Gemini baru saja reset!`,
      body:
        snippet ||
        `${siteConfig.targetAccount.handle} baru saja mengumumkan reset kuota Gemini di Antigravity.`,
      tag: `gemini-reset-${reset.tweetId}`,
    };
  }

  return {
    title: `${siteConfig.name} — Gemini quota just reset!`,
    body:
      snippet ||
      `${siteConfig.targetAccount.handle} just announced a Gemini quota reset in Antigravity.`,
    tag: `gemini-reset-${reset.tweetId}`,
  };
}

export function buildTestPushPayload(
  locale: Locale,
  latestReset?: {
    tweetId: string;
    summary?: string | null;
    tweetText: string;
  } | null,
): PushNotificationPayload {
  const sampleReset = latestReset ?? {
    tweetId: "preview",
    summary: null,
    tweetText:
      "We just reset Gemini quotas across Antigravity! Enjoy your fresh quota.",
  };

  const realPayload = buildResetPushPayload(sampleReset, locale);

  return {
    ...realPayload,
    tag: "gemini-reset-preview",
  };
}
