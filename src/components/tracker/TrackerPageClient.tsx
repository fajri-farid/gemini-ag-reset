"use client";

import { useEffect, useSyncExternalStore } from "react";
import { resolveTimeZone } from "@/lib/datetime";
import { buildDynamicHeatmap } from "@/lib/heatmap";
import { getDictionary, parseLocale } from "@/lib/i18n";
import type {
  Locale,
  PublicTrackerPayload,
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

interface TrackerPageClientProps {
  initialData: PublicTrackerPayload;
}

const emptySubscribe = () => () => {};

function subscribePrefs(callback: () => void) {
  window.addEventListener(PREFS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PREFS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getClientLocaleSnapshot(): Locale {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (queryLang) {
    return parseLocale(queryLang);
  }
  return parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

function getServerLocaleSnapshot(): Locale {
  return "en";
}

function getClientTimezoneModeSnapshot(): TimezoneMode {
  const saved = window.localStorage.getItem(TIMEZONE_STORAGE_KEY);
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
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

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
    document.documentElement.lang = locale;
  }, [locale]);

  const handleLocaleChange = (nextLocale: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);

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
    window.localStorage.setItem(TIMEZONE_STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(PREFS_EVENT));
  };

  const dict = getDictionary(locale);
  const activeTimeZone = resolveTimeZone(timezoneMode, browserTimeZone);
  const referenceNow = mounted
    ? new Date()
    : new Date(initialData.generatedAt);

  const heatmap = buildDynamicHeatmap({
    resets: initialData.resets,
    trackingStartedAt: initialData.syncStatus.trackingStartedAt,
    timeZone: activeTimeZone,
    locale,
    now: referenceNow,
  });

  const latestReset = initialData.resets[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <TrackerHeader
        dict={dict}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        lastCheckedAt={initialData.syncStatus.lastCheckedAt}
        lastStatus={initialData.syncStatus.lastStatus}
        now={referenceNow}
      />

      <main id="main-content" className="flex flex-col gap-6">
        <HeroStatusCard
          heroState={initialData.heroState}
          latestReset={latestReset}
          dict={dict}
          locale={locale}
          timeZone={activeTimeZone}
          now={referenceNow}
        />

        <KeyMetricsStrip
          metrics={initialData.metrics}
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
          resets={initialData.resets}
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
