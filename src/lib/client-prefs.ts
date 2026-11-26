"use client";

import { parseLocale } from "@/lib/i18n";
import type { Locale, TimezoneMode } from "@/lib/types";

export const LOCALE_STORAGE_KEY = "gemini-resets-lang";
export const TIMEZONE_STORAGE_KEY = "gemini-resets-tz";
export const PREFS_EVENT = "gemini-resets-prefs";

const temporaryPreferences = new Map<string, string>();

export const emptySubscribe = () => () => {};

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

export function subscribePrefs(callback: () => void): () => void {
  window.addEventListener(PREFS_EVENT, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(PREFS_EVENT, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("popstate", callback);
  };
}

export function getClientLocaleSnapshot(): Locale {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (queryLang) {
    return parseLocale(queryLang);
  }
  return parseLocale(readPreference(LOCALE_STORAGE_KEY));
}

export function getServerLocaleSnapshot(): Locale {
  return "en";
}

export function setClientLocalePreference(nextLocale: Locale): void {
  savePreference(LOCALE_STORAGE_KEY, nextLocale);

  const url = new URL(window.location.href);
  if (nextLocale === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", nextLocale);
  }
  window.history.replaceState(null, "", url.toString());
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function getClientTimezoneModeSnapshot(): TimezoneMode {
  const saved = readPreference(TIMEZONE_STORAGE_KEY);
  if (saved === "varun" || saved === "local") {
    return saved;
  }
  return "local";
}

export function getServerTimezoneModeSnapshot(): TimezoneMode {
  return "varun";
}

export function setClientTimezoneModePreference(nextMode: TimezoneMode): void {
  savePreference(TIMEZONE_STORAGE_KEY, nextMode);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function getClientBrowserZoneSnapshot(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getServerBrowserZoneSnapshot(): string {
  return "UTC";
}
