"use client";

import {
  AlertCircle,
  Check,
  Copy,
  Download,
  RefreshCw,
  Share2,
  Smartphone,
  Square,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { emptySubscribe } from "@/lib/client-prefs";
import { resolveTimeZone } from "@/lib/datetime";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import {
  canvasToPngBlob,
  renderShareCardToCanvas,
} from "@/lib/share-card-canvas";
import {
  buildShareCardFilename,
  type ShareCardRatio,
} from "@/lib/share-params";
import { buildShareCopyBundle } from "@/lib/share-templates";
import { getSiteDisplayHost, getSiteOrigin } from "@/lib/site-url";
import type {
  HeroState,
  Locale,
  ResetEvidence,
  TimezoneMode,
  TrackerMetrics,
} from "@/lib/types";
import {
  SHARE_PLATFORMS,
  SharePlatformLogo,
  type SharePlatform,
} from "./share-platform-logos";

export interface ShareTarget {
  mode: "hero" | "item";
  reset: ResetEvidence;
  gapMinutesFromPrevious?: number | null;
  sessionKey: number;
}

interface ShareResetDialogProps {
  target: ShareTarget | null;
  heroState: HeroState;
  metrics: TrackerMetrics;
  heatmapResets: readonly ResetEvidence[];
  trackingStartedAt: string;
  dict: Dictionary;
  locale: Locale;
  timezoneMode: TimezoneMode;
  browserTimeZone: string;
  now: Date;
  onClose: () => void;
}

function getServerCanShareFilesSnapshot(): boolean {
  return false;
}

function getClientCanShareFilesSnapshot(): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    typeof File === "undefined"
  ) {
    return false;
  }

  try {
    const probe = new File(["x"], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

interface ShareDialogContentProps {
  target: ShareTarget;
  heroState: HeroState;
  metrics: TrackerMetrics;
  heatmapResets: readonly ResetEvidence[];
  trackingStartedAt: string;
  initialLocale: Locale;
  initialTimezoneMode: TimezoneMode;
  browserTimeZone: string;
  now: Date;
  canShareFiles: boolean;
  uiDict: Dictionary;
  dialogTitleId: string;
  onRequestClose: () => void;
}

function ShareDialogContent({
  target,
  heroState,
  metrics,
  heatmapResets,
  trackingStartedAt,
  initialLocale,
  initialTimezoneMode,
  browserTimeZone,
  now,
  canShareFiles,
  uiDict,
  dialogTitleId,
  onRequestClose,
}: ShareDialogContentProps) {
  const [ratio, setRatio] = useState<ShareCardRatio>("4x5");
  const [cardLocale, setCardLocale] = useState<Locale>(initialLocale);
  const [cardTimezoneMode, setCardTimezoneMode] =
    useState<TimezoneMode>(initialTimezoneMode);
  const [platform, setPlatform] = useState<SharePlatform>("whatsapp");
  const platformGroupName = useId();
  const [renderError, setRenderError] = useState(false);
  const [renderNonce, setRenderNonce] = useState(0);
  const [copiedPlatform, setCopiedPlatform] = useState<SharePlatform | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyResetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const resolvedZone = resolveTimeZone(cardTimezoneMode, browserTimeZone);
  const siteOrigin = getSiteOrigin();
  const displayHost = getSiteDisplayHost();
  const cardDict = getDictionary(cardLocale);
  const tweetIdParam = target.mode === "item" ? target.reset.tweetId : null;
  const downloadFilename = buildShareCardFilename({
    ratio,
    tweetId: tweetIdParam,
  });

  // Render the 4:5 or 9:16 card 100% locally on HTML5 Canvas 2D (zero Vercel compute).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;

    void renderShareCardToCanvas(
      canvas,
      {
        ratio,
        mode: target.mode,
        heroState,
        reset: target.reset,
        metrics,
        heatmapResets,
        trackingStartedAt,
        locale: cardLocale,
        timeZone: resolvedZone,
        now,
        displayHost,
      },
      () => !cancelled,
    )
      .then(() => {
        if (!cancelled) {
          setRenderError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    ratio,
    target,
    heroState,
    metrics,
    heatmapResets,
    trackingStartedAt,
    cardLocale,
    resolvedZone,
    now,
    displayHost,
    renderNonce,
  ]);

  const copyBundle = buildShareCopyBundle({
    mode: target.mode,
    heroState,
    reset: target.reset,
    metrics,
    locale: cardLocale,
    timeZone: resolvedZone,
    now,
    siteOrigin,
  });

  const activeText =
    platform === "whatsapp"
      ? copyBundle.whatsappText
      : copyBundle.socialText;
  const platformLinks = {
    whatsapp: { href: copyBundle.whatsappUrl, label: uiDict.share.openWhatsappCta },
    x: { href: copyBundle.xIntentUrl, label: uiDict.share.openXCta },
    threads: { href: copyBundle.threadsIntentUrl, label: uiDict.share.openThreadsCta },
  };
  const activeLink = platformLinks[platform];

  async function handleCopyActiveText() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(activeText);
      setCopiedPlatform(platform);
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = window.setTimeout(() => {
        setCopiedPlatform(null);
      }, 2000);
    } catch {
      setCopyError(true);
    }
  }

  async function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setExportError(uiDict.share.downloadPngFailed);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleNativeShare() {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      const imageFile = new File([blob], downloadFilename, {
        type: "image/png",
      });

      await navigator.share({
        files: [imageFile],
        title: copyBundle.nativeShareTitle,
        text: copyBundle.nativeShareText,
        url: copyBundle.siteUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setExportError(uiDict.share.nativeShareFailed);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink/15 pb-3.5">
        <div>
          <h2
            id={dialogTitleId}
            className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
          >
            {uiDict.share.dialogTitle}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {uiDict.share.dialogSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onRequestClose}
          aria-label={uiDict.share.closeLabel}
          className="neo-interactive inline-flex h-9 w-9 shrink-0 items-center justify-center bg-surface text-ink hover:bg-surface-muted"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Left Column: Dedicated Preview Stage */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              {uiDict.share.previewLabel}
            </span>
            <span className="font-mono text-xs font-semibold text-ink-muted">
              {ratio === "4x5" ? "1080 × 1350 PNG" : "1080 × 1920 PNG"}
            </span>
          </div>

          <div className="relative flex flex-1 min-h-80 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface-muted p-4 shadow-[4px_4px_0px_#111111]">
            {renderError ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <AlertCircle
                  className="h-6 w-6 text-danger"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold text-ink">
                  {uiDict.share.previewError}
                </p>
                <button
                  type="button"
                  onClick={() => setRenderNonce((n) => n + 1)}
                  className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-gemini-tint"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{uiDict.share.retryPreview}</span>
                </button>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                aria-label={uiDict.share.previewLabel}
                className="max-h-[60dvh] w-auto max-w-full rounded-lg border-2 border-ink shadow-[3px_3px_0px_#111111]"
              />
            )}
          </div>
        </div>

        {/* Right Column: Format Controls, Message Template & Primary Export Actions */}
        <div className="flex flex-col justify-between gap-4">
          {/* 1. Card Format + Language & Timezone */}
          <div className="flex flex-col gap-3 rounded-xl border-2 border-ink bg-surface p-3.5 shadow-[3px_3px_0px_#111111]">
            <div>
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
                {uiDict.share.ratioLabel}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={ratio === "4x5"}
                  onClick={() => setRatio("4x5")}
                  className={`neo-interactive flex flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    ratio === "4x5"
                      ? "bg-ink text-white"
                      : "bg-canvas text-ink hover:bg-gemini-tint"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold">
                    <Square className="h-3.5 w-3.5" aria-hidden="true" />
                    {uiDict.share.ratio4x5Label}
                  </span>
                  <span
                    className={`text-[11px] ${
                      ratio === "4x5" ? "text-zinc-300" : "text-ink-muted"
                    }`}
                  >
                    {uiDict.share.ratio4x5Hint}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={ratio === "9x16"}
                  onClick={() => setRatio("9x16")}
                  className={`neo-interactive flex flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    ratio === "9x16"
                      ? "bg-ink text-white"
                      : "bg-canvas text-ink hover:bg-gemini-tint"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold">
                    <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                    {uiDict.share.ratio9x16Label}
                  </span>
                  <span
                    className={`text-[11px] ${
                      ratio === "9x16" ? "text-zinc-300" : "text-ink-muted"
                    }`}
                  >
                    {uiDict.share.ratio9x16Hint}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-2.5">
              <div
                role="group"
                aria-label={uiDict.share.languageLabel}
                className="inline-flex rounded-lg border-2 border-ink bg-surface-muted p-0.5"
              >
                {(["en", "id"] as const).map((langOption) => {
                  const active = cardLocale === langOption;
                  return (
                    <button
                      key={langOption}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCardLocale(langOption)}
                      className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                        active
                          ? "bg-ink text-white"
                          : "text-ink hover:bg-surface"
                      }`}
                    >
                      {langOption}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label={uiDict.share.timezoneLabel}
                className="inline-flex rounded-lg border-2 border-ink bg-surface-muted p-0.5"
              >
                {(
                  [
                    { mode: "varun", label: cardDict.heatmap.varunTimeLabel },
                    { mode: "local", label: cardDict.heatmap.localTimeLabel },
                  ] as const
                ).map((option) => {
                  const active = cardTimezoneMode === option.mode;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCardTimezoneMode(option.mode)}
                      className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${
                        active
                          ? "bg-ink text-white"
                          : "text-ink hover:bg-surface"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Message Templates */}
          <div className="flex flex-1 flex-col justify-between gap-2.5 rounded-xl border-2 border-ink bg-surface p-3.5 shadow-[3px_3px_0px_#111111]">
            <fieldset className="min-w-0">
              <legend className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
                {uiDict.share.templatesHeading}
              </legend>

              <div className="grid grid-cols-3 gap-0.5 rounded-lg border-2 border-ink bg-surface-muted p-0.5">
                {SHARE_PLATFORMS.map(({ id, name }) => (
                  <label key={id} className="min-w-0 cursor-pointer">
                    <input
                      type="radio"
                      name={platformGroupName}
                      value={id}
                      checked={platform === id}
                      onChange={() => {
                        setPlatform(id);
                        setCopyError(false);
                      }}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-9 flex-wrap items-center justify-center gap-x-1.5 rounded-md px-1 py-1 text-center text-xs font-bold text-ink peer-not-checked:hover:bg-surface peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gemini-blue">
                      <SharePlatformLogo platform={id} />
                      {name}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <textarea
              readOnly
              rows={7}
              aria-label={uiDict.share.templatesHeading}
              value={activeText}
              className="w-full flex-1 resize-none rounded-lg border-2 border-ink/20 bg-canvas p-3 font-mono text-xs leading-relaxed text-ink focus:border-ink focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyActiveText()}
                className="neo-interactive inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 bg-surface px-3 py-2 text-xs font-extrabold text-ink hover:bg-gemini-tint"
              >
                {copiedPlatform === platform ? (
                  <>
                    <Check
                      className="h-3.5 w-3.5 text-reset-live"
                      aria-hidden="true"
                    />
                    <span>{uiDict.share.copiedFeedback}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{uiDict.share.copyTextCta}</span>
                  </>
                )}
              </button>

              <a
                href={activeLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="neo-interactive inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 bg-ink px-3 py-2 text-center text-xs font-extrabold text-white hover:bg-zinc-800"
              >
                <SharePlatformLogo platform={platform} />
                <span>{activeLink.label}</span>
              </a>
            </div>

            {copyError && (
              <p role="alert" className="text-xs font-medium text-danger">
                {uiDict.share.copyFailedFeedback}
              </p>
            )}
          </div>

          {/* 3. Primary Image Export Actions (aligned to bottom of modal) */}
          <div className="flex flex-col gap-2">
            <div className={canShareFiles ? "grid grid-cols-2 gap-2.5" : "flex"}>
              {canShareFiles && (
                <button
                  type="button"
                  disabled={isExporting || renderError}
                  onClick={() => void handleNativeShare()}
                  className="neo-interactive inline-flex min-h-11 w-full items-center justify-center gap-2 bg-gemini-blue px-4 py-2.5 text-sm font-extrabold text-white hover:bg-gemini-blue-hover disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isExporting
                      ? uiDict.share.nativeSharingCta
                      : uiDict.share.nativeShareCta}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isExporting || renderError}
                onClick={() => void handleDownloadPng()}
                className={`neo-interactive inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-extrabold disabled:opacity-60 ${
                  canShareFiles
                    ? "bg-surface text-ink hover:bg-gemini-tint"
                    : "bg-gemini-blue text-white hover:bg-gemini-blue-hover"
                }`}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>{uiDict.share.downloadPngCta}</span>
              </button>
            </div>

            {exportError && (
              <p role="alert" className="text-xs font-medium text-danger">
                {exportError}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function ShareResetDialog({
  target,
  heroState,
  metrics,
  heatmapResets,
  trackingStartedAt,
  dict,
  locale,
  timezoneMode,
  browserTimeZone,
  now,
  onClose,
}: ShareResetDialogProps) {
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const canShareFiles = useSyncExternalStore(
    emptySubscribe,
    getClientCanShareFilesSnapshot,
    getServerCanShareFilesSnapshot,
  );

  const isOpen = target !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleDialogBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    if (event.target !== dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const isDialogContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!isDialogContent) {
      dialog.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby={dialogTitleId}
      onClose={onClose}
      onClick={handleDialogBackdropClick}
      className="note-dialog m-auto max-h-[92dvh] w-[min(95vw,56rem)] overflow-y-auto rounded-xl border-2 border-ink bg-canvas p-5 text-ink shadow-[6px_6px_0px_#111111] sm:p-6"
    >
      {target && (
        <ShareDialogContent
          key={`${target.mode}-${target.reset.tweetId}-${target.sessionKey}`}
          target={target}
          heroState={heroState}
          metrics={metrics}
          heatmapResets={heatmapResets}
          trackingStartedAt={trackingStartedAt}
          initialLocale={locale}
          initialTimezoneMode={timezoneMode}
          browserTimeZone={browserTimeZone}
          now={now}
          canShareFiles={canShareFiles}
          uiDict={dict}
          dialogTitleId={dialogTitleId}
          onRequestClose={() => dialogRef.current?.close()}
        />
      )}
    </dialog>
  );
}
