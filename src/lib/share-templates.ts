import { siteConfig } from "@/config/site";
import { formatDaysMetric, formatTimestamp } from "./datetime";
import { isFreshReset } from "./reset-announcement";
import { getSiteOrigin } from "./site-url";
import type {
  HeroState,
  Locale,
  ResetEvidence,
  TrackerMetrics,
} from "./types";

export interface ShareCopyInput {
  mode: "hero" | "item";
  heroState?: HeroState;
  reset: ResetEvidence;
  metrics: TrackerMetrics;
  locale: Locale;
  timeZone: string;
  now: Date;
  siteOrigin?: string;
}

export interface ShareCopyBundle {
  whatsappText: string;
  whatsappUrl: string;
  socialCaption: string;
  socialText: string;
  xIntentUrl: string;
  threadsIntentUrl: string;
  nativeShareTitle: string;
  nativeShareText: string;
  siteUrl: string;
}

/**
 * Collapses extra whitespace/newlines and truncates long tweet text cleanly.
 */
export function truncateTweetSnippet(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

function buildMetricsLine(metrics: TrackerMetrics, locale: Locale): string {
  const avg = formatDaysMetric(metrics.avgIntervalDays, locale);
  const longest = formatDaysMetric(metrics.longestWaitDays, locale);

  if (locale === "id") {
    return `Total reset: ${metrics.total} · Rata-rata jeda: ${avg} · Jeda terlama: ${longest}`;
  }
  return `Resets: ${metrics.total} · Avg interval: ${avg} · Longest wait: ${longest}`;
}

/**
 * Generates bilingual WhatsApp, X, Threads, and native share copy synchronized
 * with the exact `< 5 hours` (`isFreshReset`) threshold used by the share cards:
 * - `< 5h` on Hero mode -> breaking reset announcement copy
 * - `>= 5h` on Hero mode -> clean web-tracker share copy with Last Reset & metrics
 * - `item` mode -> historical reset announcement copy
 */
export function buildShareCopyBundle({
  mode,
  reset,
  metrics,
  locale,
  timeZone,
  now,
  siteOrigin,
}: ShareCopyInput): ShareCopyBundle {
  const origin = siteOrigin ?? getSiteOrigin();
  const formattedTime = formatTimestamp(reset.resetAt, locale, timeZone);
  const snippet = truncateTweetSnippet(reset.tweetText, 160);
  const handle = siteConfig.targetAccount.handle;
  const isOverview =
    mode === "hero" && !isFreshReset(reset.resetAt, now.getTime());
  const isIndonesian = locale === "id";
  const copy = isIndonesian
    ? {
        fresh: "Kuota Gemini di Antigravity baru di-reset!",
        overview: "Kapan kuota Gemini di Antigravity terakhir di-reset?",
        archive: "Arsip reset kuota Gemini di Antigravity",
        lastReset: "Reset terakhir tercatat",
        source: "Unggahan asli",
        tracker: "Cek riwayat dan pola reset di Gemini Resets.",
      }
    : {
        fresh: "Gemini quota in Antigravity just reset!",
        overview: "When did Gemini quota in Antigravity last reset?",
        archive: "From the archive: Gemini quota reset in Antigravity",
        lastReset: "Last recorded reset",
        source: "Original post",
        tracker: "See reset history and patterns on Gemini Resets.",
      };
  const heroTitle = isOverview ? copy.overview : copy.fresh;
  const title = mode === "item" ? copy.archive : heroTitle;
  const dateLine = isOverview
    ? `${copy.lastReset}: ${formattedTime}`
    : formattedTime;
  const sourceLine = `${copy.source}: ${reset.tweetUrl}`;
  const excerpt = snippet ? `"${snippet}" — ${handle}` : null;
  const details = isOverview ? buildMetricsLine(metrics, locale) : excerpt;
  const whatsappText = [
    `*${title}*`,
    dateLine,
    ...(details ? [details] : []),
    "",
    sourceLine,
    "",
    copy.tracker,
    origin,
  ].join("\n");
  const socialCaption = [`${title}\n${dateLine}`, sourceLine, copy.tracker].join(
    "\n\n",
  );
  const socialText = `${socialCaption}\n${origin}`;

  return {
    whatsappText,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
    socialCaption,
    socialText,
    xIntentUrl: `https://x.com/intent/tweet?text=${encodeURIComponent(socialCaption)}&url=${encodeURIComponent(origin)}`,
    threadsIntentUrl: `https://www.threads.com/intent/post?text=${encodeURIComponent(socialText)}`,
    nativeShareTitle: title,
    nativeShareText: socialCaption,
    siteUrl: origin,
  };
}
