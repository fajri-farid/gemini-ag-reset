"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import {
  getVapidPublicKey,
  isIosNeedsInstall,
  isPushDisablePending,
  isPushSupportedInBrowser,
  prepareBrowserPush,
  subscribeBrowserToPush,
  syncExistingBrowserPush,
  unsubscribeBrowserFromPush,
} from "@/lib/push-client";
import type { Locale } from "@/lib/types";

interface PushNotifyButtonProps {
  dict: Dictionary;
  locale: Locale;
}

export function PushNotifyButton({ dict, locale }: PushNotifyButtonProps) {
  const vapidPublicKey = getVapidPublicKey();
  const confirmTitleId = useId();
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!vapidPublicKey) {
      return;
    }

    let cancelled = false;
    function refresh() {
      void prepareBrowserPush()
        .then(() => syncExistingBrowserPush(locale))
        .then((active) => {
          if (!cancelled) setIsSubscribed(active);
        })
        .catch(() => {
          if (!cancelled) setFeedback(dict.hero.push.errorHint);
        })
        .finally(() => {
          if (!cancelled) {
            setIsDisabling(isPushDisablePending());
            setIsReady(true);
          }
        });
    }
    refresh();
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("online", refresh);
    };
  }, [dict.hero.push.errorHint, locale, vapidPublicKey]);

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (isConfirmOpen && dialog && !dialog.open) {
      dialog.showModal();
      cancelButtonRef.current?.focus();
    }
  }, [isConfirmOpen]);

  if (!vapidPublicKey) {
    return null;
  }

  const runUnsubscribe = async () => {
    setIsWorking(true);
    setFeedback(null);
    try {
      await unsubscribeBrowserFromPush();
      setIsSubscribed(false);
      setIsDisabling(false);
      setFeedback(dict.hero.push.disabledFeedback);
    } catch {
      setIsDisabling(isPushDisablePending());
      setFeedback(dict.hero.push.disableErrorHint);
    } finally {
      setIsWorking(false);
    }
  };

  const handleToggle = async () => {
    if (isWorking) {
      return;
    }

    setFeedback(null);

    if (isDisabling) {
      await runUnsubscribe();
      return;
    }

    if (isSubscribed) {
      setIsConfirmOpen(true);
      return;
    }

    if (isIosNeedsInstall()) {
      setFeedback(dict.hero.push.iosInstallHint);
      return;
    }

    if (!isPushSupportedInBrowser()) {
      setFeedback(dict.hero.push.unsupportedHint);
      return;
    }

    setIsWorking(true);
    try {
      await subscribeBrowserToPush(locale);
      setIsSubscribed(true);
      setFeedback(dict.hero.push.enabledFeedback);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "PERMISSION_DENIED") {
        setFeedback(dict.hero.push.permissionDeniedHint);
      } else if (code === "IOS_INSTALL_REQUIRED") {
        setFeedback(dict.hero.push.iosInstallHint);
      } else if (code === "PUSH_UNSUPPORTED") {
        setFeedback(dict.hero.push.unsupportedHint);
      } else {
        if (code === "PUSH_NOT_READY") void prepareBrowserPush().catch(() => undefined);
        setFeedback(dict.hero.push.errorHint);
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleConfirmDialogClose = (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => {
    const dialog = event.currentTarget;
    const decision = dialog.returnValue;
    dialog.returnValue = "";
    setIsConfirmOpen(false);

    if (decision === "confirm") {
      void runUnsubscribe();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={!isReady || isWorking}
        aria-haspopup={isSubscribed && !isDisabling ? "dialog" : undefined}
        className={`neo-interactive inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold disabled:opacity-60 ${
          isSubscribed
            ? "bg-reset-live-bg text-ink hover:bg-surface"
            : "bg-surface text-ink hover:bg-gemini-tint"
        }`}
      >
        {isWorking ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : isSubscribed ? (
          <BellRing
            className="h-4 w-4 text-reset-live"
            aria-hidden="true"
          />
        ) : (
          <Bell className="h-4 w-4" aria-hidden="true" />
        )}
        <span>
          {isWorking
            ? dict.hero.push.loadingCta
            : isDisabling
              ? dict.hero.push.retryDisableCta
              : isSubscribed
                ? dict.hero.push.notifyingCta
                : dict.hero.push.notifyCta}
        </span>
      </button>

      <p role="status" className={feedback ? "basis-full text-xs font-medium text-ink-muted" : "sr-only"}>
        {feedback}
      </p>

      <dialog
        ref={confirmDialogRef}
        aria-labelledby={confirmTitleId}
        onClose={handleConfirmDialogClose}
        className="m-auto w-[min(92vw,26rem)] overscroll-contain rounded-xl border-2 border-ink bg-surface p-6 text-ink shadow-[4px_4px_0px_#111111] backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-ink/45"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-surface-muted text-ink">
            <BellOff className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id={confirmTitleId}
              className="text-lg font-extrabold tracking-tight text-ink"
            >
              {dict.hero.push.confirmDisableTitle}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              {dict.hero.push.confirmDisableDescription}
            </p>
          </div>
        </div>

        <form
          method="dialog"
          className="mt-6 flex flex-wrap items-center justify-end gap-3"
        >
          <button
            ref={cancelButtonRef}
            type="submit"
            value="cancel"
            className="neo-interactive bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-gemini-tint"
          >
            {dict.hero.push.confirmDisableCancel}
          </button>
          <button
            type="submit"
            value="confirm"
            className="neo-interactive bg-danger px-4 py-2 text-xs font-bold text-white hover:opacity-90"
          >
            {dict.hero.push.confirmDisableConfirm}
          </button>
        </form>
      </dialog>
    </>
  );
}
