import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Tag } from "lucide-react";
import { CURRENT_TAG } from "@/config/releases";
import { siteConfig } from "@/config/site";
import { formatShortMinutesAgo } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, SyncStatusState } from "@/lib/types";

interface TrackerHeaderProps {
  dict: Dictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  lastCheckedAt: string | null;
  lastStatus: SyncStatusState;
  now: Date;
}

export function TrackerHeader({
  dict,
  locale,
  onLocaleChange,
  lastCheckedAt,
  lastStatus,
  now,
}: TrackerHeaderProps) {
  const statusText =
    lastStatus === "error"
      ? dict.header.checkingDelayed
      : lastCheckedAt
        ? `${dict.header.lastCheckedPrefix} ${formatShortMinutesAgo(lastCheckedAt, locale, now)}`
        : dict.header.neverChecked;

  const isDelayed = lastStatus === "error";

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-surface p-1.5 shadow-[2px_2px_0px_#111111]">
            <Image
              src="/gemini logo.webp"
              alt=""
              width={24}
              height={24}
              loading="eager"
              className="h-6 w-6 object-contain"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {siteConfig.name}
            </h1>
            <Link
              href="/changelog"
              className="neo-interactive inline-flex min-h-6 items-center gap-1 rounded-full bg-gemini-tint px-2.5 py-0.5 font-mono text-xs font-bold text-gemini-blue hover:bg-gemini-blue hover:text-white"
            >
              <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{CURRENT_TAG}</span>
              <span className="sr-only">
                {" "}
                — {dict.header.versionBadgeContext}
              </span>
            </Link>
          </div>
        </div>

        <div
          className="inline-flex overflow-hidden rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#111111]"
          role="group"
          aria-label={dict.header.languageSwitchLabel}
        >
          <button
            type="button"
            aria-pressed={locale === "en"}
            onClick={() => onLocaleChange("en")}
            className={`px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              locale === "en"
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            aria-pressed={locale === "id"}
            onClick={() => onLocaleChange("id")}
            className={`border-l-2 border-ink px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              locale === "id"
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            ID
          </button>
        </div>
      </div>

      <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
        {dict.header.tagline}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface px-3.5 py-1.5 font-mono text-xs font-medium text-ink shadow-[2px_2px_0px_#111111]">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full border border-ink ${
              isDelayed ? "bg-warning" : "bg-reset-live"
            }`}
            aria-hidden="true"
          />
          <span>{statusText}</span>
        </div>

        <a
          href={siteConfig.targetAccount.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-gemini-tint"
        >
          <span>{dict.header.viewProfile}</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
