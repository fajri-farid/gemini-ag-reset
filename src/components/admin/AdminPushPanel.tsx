"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import type { AdminPushStatusResponse } from "@/lib/admin-api";
import {
  createBrowserPushSubscription,
  getCurrentBrowserPushSubscription,
  getVapidPublicKey,
  isIosNeedsInstall,
  isPushSupportedInBrowser,
  prepareBrowserPush,
  serializePushSubscription,
  type SerializedPushSubscription,
} from "@/lib/push-client";
import type { Locale } from "@/lib/types";

interface AdminPushPanelProps {
  pushStatus: AdminPushStatusResponse | null;
  onRefreshPushStatus: () => Promise<void>;
  onSendTestPush: (
    subscription: SerializedPushSubscription,
    locale: Locale,
  ) => Promise<void>;
}

export function AdminPushPanel({
  pushStatus,
  onRefreshPushStatus,
  onSendTestPush,
}: AdminPushPanelProps) {
  const clientVapidKey = getVapidPublicKey();
  const [browserSubscribed, setBrowserSubscribed] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [demoLocale, setDemoLocale] = useState<Locale>("en");
  const [isEnabling, setIsEnabling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void prepareBrowserPush()
      .then(getCurrentBrowserPushSubscription)
      .then((sub) => {
        if (!cancelled) {
          setBrowserSubscribed(Boolean(sub));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBrowserReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isFullyConfigured =
    Boolean(pushStatus?.configured) && Boolean(clientVapidKey);

  const handleEnableThisBrowser = async () => {
    setPanelFeedback(null);

    if (isIosNeedsInstall()) {
      setPanelFeedback({
        tone: "error",
        message:
          "On iPhone/iPad, add this web app to Home Screen first before enabling Web Push.",
      });
      return;
    }

    if (!isPushSupportedInBrowser()) {
      setPanelFeedback({
        tone: "error",
        message: "This browser does not support Web Push notifications.",
      });
      return;
    }

    setIsEnabling(true);
    try {
      await createBrowserPushSubscription();
      setBrowserSubscribed(true);
      setPanelFeedback({
        tone: "success",
        message: "This browser is ready for a test notification.",
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setPanelFeedback({
        tone: "error",
        message:
          code === "PERMISSION_DENIED"
            ? "Browser notification permission was denied. Allow notifications in site settings and retry."
            : "Could not subscribe this browser for push notifications.",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSendTest = async () => {
    setPanelFeedback(null);

    if (!isFullyConfigured) {
      setPanelFeedback({
        tone: "error",
        message:
          "Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT first.",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const existing = await getCurrentBrowserPushSubscription();
      const serialized = existing && serializePushSubscription(existing);
      if (!serialized) {
        setBrowserSubscribed(false);
        throw new Error("Enable test notifications on this browser first.");
      }

      await onSendTestPush(serialized, demoLocale);
      setPanelFeedback({
        tone: "success",
        message: `Push service accepted the ${demoLocale.toUpperCase()} demo for this browser.`,
      });
    } catch (error) {
      setPanelFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to send test push notification.",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshPushStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section
      aria-labelledby="admin-push-heading"
      className="neo-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="admin-push-heading"
              className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
            >
              Web Push &amp; Test Demo
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                isFullyConfigured
                  ? "bg-reset-live text-white"
                  : "bg-surface-muted text-ink"
              }`}
            >
              {isFullyConfigured ? "Configured" : "Not Configured"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            Preview the exact live reset notification (using your latest
            recorded reset) in your own browser without broadcasting to public
            subscribers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border-2 border-ink bg-canvas px-3 py-1.5 font-mono text-xs font-bold text-ink">
            {pushStatus ? `${pushStatus.subscriberCount} subscribers` : "—"}
          </span>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-label="Refresh push subscriber count"
            className="neo-interactive inline-flex h-8 w-8 items-center justify-center bg-surface text-ink hover:bg-gemini-tint disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {!isFullyConfigured && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-ink/35 bg-canvas p-3.5 text-xs text-ink-muted">
          <p className="font-mono font-bold text-ink">
            Setup required for Web Push:
          </p>
          <p className="mt-1">
            Generate VAPID keys via{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-ink">
              npx web-push generate-vapid-keys
            </code>{" "}
            and set{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-ink">
              NEXT_PUBLIC_VAPID_PUBLIC_KEY
            </code>
            ,{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-ink">
              VAPID_PRIVATE_KEY
            </code>
            , and{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-ink">
              VAPID_SUBJECT
            </code>
            .
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-canvas p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border border-ink px-2.5 py-1 font-mono text-xs font-bold ${
              browserSubscribed
                ? "bg-reset-live-bg text-ink"
                : "bg-surface text-ink-muted"
            }`}
          >
            {browserSubscribed ? (
              <BellRing
                className="h-3.5 w-3.5 text-reset-live"
                aria-hidden="true"
              />
            ) : (
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {browserSubscribed
                ? "This browser is ready for a test"
                : "Test notifications require permission"}
            </span>
          </span>

          {!browserSubscribed && isFullyConfigured && (
            <button
              type="button"
              onClick={() => void handleEnableThisBrowser()}
              disabled={!browserReady || isEnabling || isSendingTest}
              className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-ink hover:bg-gemini-tint disabled:opacity-60"
            >
              {isEnabling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{isEnabling ? "Enabling..." : "Enable on This Browser"}</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Test notification language"
            className="inline-flex rounded-lg border-2 border-ink bg-surface p-0.5 font-mono text-xs font-bold"
          >
            {(["en", "id"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setDemoLocale(lang)}
                aria-pressed={demoLocale === lang}
                className={`rounded-md px-2.5 py-1 uppercase transition-colors ${
                  demoLocale === lang
                    ? "bg-ink text-white"
                    : "text-ink hover:bg-surface-muted"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleSendTest()}
            disabled={!isFullyConfigured || !browserSubscribed || isSendingTest || isEnabling}
            className="neo-interactive inline-flex items-center gap-2 bg-gemini-violet px-4 py-2 font-mono text-xs font-bold text-white hover:opacity-95 disabled:opacity-55"
          >
            {isSendingTest ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isSendingTest
                ? "Sending Demo..."
                : "Send Test Push (My Browser Only)"}
            </span>
          </button>
        </div>
      </div>

      {panelFeedback && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${
            panelFeedback.tone === "success" ? "text-ink" : "text-danger"
          }`}
        >
          {panelFeedback.tone === "success" ? (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-reset-live"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-danger"
              aria-hidden="true"
            />
          )}
          <span>{panelFeedback.message}</span>
        </p>
      )}
    </section>
  );
}
