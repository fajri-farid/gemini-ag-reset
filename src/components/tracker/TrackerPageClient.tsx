"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MS_PER_MINUTE, resolveTimeZone } from "@/lib/datetime";
import { buildDynamicHeatmap } from "@/lib/heatmap";
import { getDictionary, parseLocale } from "@/lib/i18n";
import { computeHeroState, includeCurrentWait } from "@/lib/metrics";
import type {
  Locale,
  PublicTrackerHomeData,
  TimezoneMode,
} from "@/lib/types";
import { HeroStatusCard } from "./HeroStatusCard";
import { KeyMetricsStrip } from "./KeyMetricsStrip";
import { ResetAnnouncementsFeed } from "./ResetAnnouncementsFeed";
import { ResetHeatmap } from "./ResetHeatmap";
import { TrackerFooter } from "./TrackerFooter";
import { TrackerHeader } from "./TrackerHeader";

const LOCALE_STORAGE_KEY = "gemini-resets-lang";
const TIMEZONE_STORAGE_KEY = "gemini-resets-tz";
const PREFS_EVENT = "gemini-resets-prefs";
const temporaryPreferences = new Map<string, string>();

interface TrackerPageClientProps {
  initialData: PublicTrackerHomeData;
}

const emptySubscribe = () => () => {};

function readPreference(key: string): string | null {
  try {
    return temporaryPreferences.get(key) ?? window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    temporaryPreferences.delete(key);
  } catch {
    temporaryPreferences.set(key, value);
  }
}

function subscribePrefs(callback: () => void) {
  window.addEventListener(PREFS_EVENT, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(PREFS_EVENT, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("popstate", callback);
  };
}

function getClientLocaleSnapshot(): Locale {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (queryLang) {
    return parseLocale(queryLang);
  }
  return parseLocale(readPreference(LOCALE_STORAGE_KEY));
}

function getServerLocaleSnapshot(): Locale {
  return "en";
}

function getClientTimezoneModeSnapshot(): TimezoneMode {
  const saved = readPreference(TIMEZONE_STORAGE_KEY);
  if (saved === "varun" || saved === "local") {
    return saved;
  }
  return "local";
}

function getServerTimezoneModeSnapshot(): TimezoneMode {
  return "varun";
}

function getClientBrowserZoneSnapshot(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getServerBrowserZoneSnapshot(): string {
  return "UTC";
}

export function TrackerPageClient({ initialData }: TrackerPageClientProps) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const locale = useSyncExternalStore(
    subscribePrefs,
    getClientLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  const timezoneMode = useSyncExternalStore(
    subscribePrefs,
    getClientTimezoneModeSnapshot,
    getServerTimezoneModeSnapshot,
  );

  const browserTimeZone = useSyncExternalStore(
    emptySubscribe,
    getClientBrowserZoneSnapshot,
    getServerBrowserZoneSnapshot,
  );

  useEffect(() => {
    const root = document.documentElement;
    const previousLocale = root.lang;
    root.lang = locale;
    return () => {
      root.lang = previousLocale;
    };
  }, [locale]);

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    const initialUpdate = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, MS_PER_MINUTE);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, []);

  const handleLocaleChange = (nextLocale: Locale) => {
    savePreference(LOCALE_STORAGE_KEY, nextLocale);

    const url = new URL(window.location.href);
    if (nextLocale === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", nextLocale);
    }
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event(PREFS_EVENT));
  };

  const handleTimezoneModeChange = (nextMode: TimezoneMode) => {
    savePreference(TIMEZONE_STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(PREFS_EVENT));
  };

  const dict = getDictionary(locale);
  const activeTimeZone = resolveTimeZone(timezoneMode, browserTimeZone);
  const referenceNow = new Date(currentTime ?? initialData.generatedAt);

  const heatmap = buildDynamicHeatmap({
    resets: initialData.heatmapResets,
    trackingStartedAt: initialData.syncStatus.trackingStartedAt,
    timeZone: activeTimeZone,
    locale,
    now: referenceNow,
  });

  const latestReset = initialData.feed.items[0] ?? null;

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
      <TrackerHeader
        dict={dict}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        lastCheckedAt={initialData.syncStatus.lastCheckedAt}
        lastStatus={initialData.syncStatus.lastStatus}
        now={referenceNow}
      />

      <main id="main-content" tabIndex={-1} className="flex flex-col gap-6">
        <HeroStatusCard
          heroState={computeHeroState(latestReset?.resetAt, referenceNow)}
          latestReset={latestReset}
          dict={dict}
          locale={locale}
          timeZone={activeTimeZone}
          now={referenceNow}
        />

        <KeyMetricsStrip
          metrics={includeCurrentWait(initialData.historicalMetrics, latestReset?.resetAt, referenceNow)}
          dict={dict}
          locale={locale}
        />

        <ResetHeatmap
          heatmap={heatmap}
          dict={dict}
          locale={locale}
          timezoneMode={timezoneMode}
          timeZone={activeTimeZone}
          onTimezoneModeChange={handleTimezoneModeChange}
        />

        <ResetAnnouncementsFeed
          initialPage={initialData.feed}
          dict={dict}
          locale={locale}
          timeZone={activeTimeZone}
        />
      </main>

      <TrackerFooter
        dict={dict}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />
    </div>
  );
}
