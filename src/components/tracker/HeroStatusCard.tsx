import Image from "next/image";
import { ArrowUpRight, Clock, Share2, Zap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { formatRelativeTime, formatTimestamp } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import type { HeroState, Locale, ResetEvidence } from "@/lib/types";
import { PushNotifyButton } from "./PushNotifyButton";

interface HeroStatusCardProps {
  heroState: HeroState;
  latestReset: ResetEvidence | null;
  dict: Dictionary;
  locale: Locale;
  timeZone: string;
  now: Date;
  onShare?: () => void;
}

export function HeroStatusCard({
  heroState,
  latestReset,
  dict,
  locale,
  timeZone,
  now,
  onShare,
}: HeroStatusCardProps) {
  if (heroState === "empty" || !latestReset) {
    return (
      <section aria-labelledby="hero-status-heading">
        <div className="neo-card neo-dotted-grid bg-surface p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-surface-muted px-3 py-1 font-mono text-xs font-bold tracking-wider text-ink">
            <Image
              src="/gemini logo.webp"
              alt=""
              width={14}
              height={14}
              className="h-3.5 w-3.5 object-contain"
              aria-hidden="true"
            />
            <span>{dict.hero.emptyBadge}</span>
          </div>

          <h2
            id="hero-status-heading"
            className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
          >
            {dict.hero.emptyTitle}
          </h2>

          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            {dict.hero.emptyDescription}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={siteConfig.targetAccount.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="neo-interactive inline-flex items-center gap-2 bg-gemini-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-gemini-blue-hover"
            >
              <span>{dict.header.viewProfile}</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <PushNotifyButton dict={dict} locale={locale} />
          </div>
        </div>
      </section>
    );
  }

  const isRecent = heroState === "reset_recently";
  const relativeText = formatRelativeTime(latestReset.resetAt, locale, now);
  const formattedTime = formatTimestamp(latestReset.resetAt, locale, timeZone);
  const tweetSnippet = latestReset.tweetText.trim() || dict.hero.noSummaryFallback;

  return (
    <section aria-labelledby="hero-status-heading">
      <div
        className={`neo-card neo-dotted-grid p-6 sm:p-8 ${
          isRecent ? "bg-reset-live-bg" : "bg-surface"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-lg border-2 border-ink px-3 py-1 font-mono text-xs font-bold tracking-wider ${
              isRecent
                ? "bg-reset-live text-white"
                : "bg-surface-muted text-ink"
            }`}
          >
            {isRecent ? (
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isRecent
                ? dict.hero.resetRecentlyBadge
                : dict.hero.waitingBadge}
            </span>
          </div>

          <time
            dateTime={latestReset.resetAt}
            className="font-mono text-xs font-medium text-ink-muted sm:text-sm"
          >
            {formattedTime}
          </time>
        </div>

        <h2
          id="hero-status-heading"
          className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl"
        >
          {relativeText}
        </h2>

        <p className="mt-4 line-clamp-3 max-w-2xl text-base leading-relaxed text-ink">
          {tweetSnippet}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={latestReset.tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`neo-interactive inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold ${
              isRecent
                ? "bg-gemini-blue text-white hover:bg-gemini-blue-hover"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            <span>
              {isRecent
                ? dict.hero.viewTweetCta
                : dict.hero.viewLastTweetCta}
            </span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="neo-interactive inline-flex items-center gap-2 bg-surface px-4 py-2.5 text-sm font-bold text-ink hover:bg-gemini-tint"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>{dict.hero.shareCta}</span>
            </button>
          )}

          <PushNotifyButton dict={dict} locale={locale} />
        </div>
      </div>
    </section>
  );
}
