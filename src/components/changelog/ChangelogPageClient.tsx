"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { TrackerFooter } from "@/components/tracker/TrackerFooter";
import {
  CURRENT_TAG,
  getGitHubReleasesIndexUrl,
  getGitHubReleaseUrl,
  RELEASES,
  type ReleaseChangeCategory,
} from "@/config/releases";
import {
  getClientLocaleSnapshot,
  getServerLocaleSnapshot,
  setClientLocalePreference,
  subscribePrefs,
} from "@/lib/client-prefs";
import { formatDateKeyLabel } from "@/lib/datetime";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const RELEASE_CATEGORY_ORDER: readonly ReleaseChangeCategory[] = [
  "added",
  "improved",
  "fixed",
];

function renderCategoryIcon(category: ReleaseChangeCategory) {
  switch (category) {
    case "added":
      return (
        <Sparkles
          className="h-3.5 w-3.5 text-gemini-blue"
          aria-hidden="true"
        />
      );
    case "improved":
      return (
        <TrendingUp
          className="h-3.5 w-3.5 text-gemini-violet"
          aria-hidden="true"
        />
      );
    case "fixed":
      return (
        <CheckCircle2
          className="h-3.5 w-3.5 text-reset-live"
          aria-hidden="true"
        />
      );
  }
}

export function ChangelogPageClient() {
  const locale = useSyncExternalStore(
    subscribePrefs,
    getClientLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  useEffect(() => {
    const root = document.documentElement;
    const previousLocale = root.lang;
    root.lang = locale;
    return () => {
      root.lang = previousLocale;
    };
  }, [locale]);

  const handleLocaleChange = (nextLocale: Locale) => {
    setClientLocalePreference(nextLocale);
  };

  const dict = getDictionary(locale);

  return (
    <div
      lang={locale}
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        {dict.header.skipToContent}
      </a>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="neo-interactive inline-flex min-h-8 items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-gemini-tint"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{dict.changelog.backToTracker}</span>
          </Link>

          <div
            className="inline-flex overflow-hidden rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#111111]"
            role="group"
            aria-label={dict.header.languageSwitchLabel}
          >
            <button
              type="button"
              aria-pressed={locale === "en"}
              onClick={() => handleLocaleChange("en")}
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
              onClick={() => handleLocaleChange("id")}
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
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {dict.changelog.pageTitle}
          </h1>
        </div>

        <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
          {dict.changelog.subtitle}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-ink shadow-[2px_2px_0px_#111111]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink bg-reset-live"
              aria-hidden="true"
            />
            <span>
              {dict.changelog.currentVersionPrefix} {CURRENT_TAG}
            </span>
          </div>

          <a
            href={getGitHubReleasesIndexUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-gemini-tint"
          >
            <span>{dict.changelog.allGitHubReleases}</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex flex-col gap-6">
        <ol role="list" className="flex flex-col gap-6">
          {RELEASES.map((entry) => {
            const localized = entry.content[locale];

            return (
              <li key={entry.version}>
                <article className="neo-card overflow-hidden bg-surface">
                  <div className="neo-dotted-grid flex flex-col gap-3 border-b-2 border-ink bg-surface px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-gemini-blue px-2.5 py-0.5 font-mono text-xs font-extrabold text-white shadow-[2px_2px_0px_#111111]">
                          <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{entry.tag}</span>
                        </span>

                        {entry.isLatest && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-reset-live-bg px-2.5 py-0.5 font-mono text-xs font-extrabold text-ink">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full border border-ink bg-reset-live"
                              aria-hidden="true"
                            />
                            <span>{dict.changelog.latestBadge}</span>
                          </span>
                        )}

                        <time
                          dateTime={entry.publishedOn}
                          className="font-mono text-xs font-medium text-ink-muted"
                        >
                          {formatDateKeyLabel(entry.publishedOn, locale)}
                        </time>
                      </div>

                      <a
                        href={getGitHubReleaseUrl(entry.tag)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="neo-interactive inline-flex min-h-7 items-center gap-1.5 bg-surface px-3 py-1 font-mono text-xs font-semibold text-ink hover:bg-gemini-tint"
                      >
                        <span>
                          {dict.changelog.releaseOnGitHubPrefix} {entry.tag}
                        </span>
                        <ExternalLink
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </a>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                        {entry.tag} — {localized.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
                        {localized.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
                    {RELEASE_CATEGORY_ORDER.map((category) => {
                      const items = localized.sections[category];
                      if (!items || items.length === 0) {
                        return null;
                      }

                      return (
                        <section key={category}>
                          <h3 className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink">
                            {renderCategoryIcon(category)}
                            <span>{dict.changelog.categories[category]}</span>
                          </h3>
                          <ul
                            role="list"
                            className="mt-3 flex flex-col gap-2.5"
                          >
                            {items.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2.5 text-sm leading-relaxed text-ink sm:text-base"
                              >
                                <span
                                  className="mt-2 h-2 w-2 shrink-0 rounded-xs border border-ink bg-gemini-sky"
                                  aria-hidden="true"
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </main>

      <TrackerFooter
        dict={dict}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        currentPath="/changelog"
      />
    </div>
  );
}
