import { siteConfig } from "@/config/site";
import type { Locale, TimezoneMode } from "./types";

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const VARUN_TIMEZONE = siteConfig.targetAccount.timezone;

function toIntlLocale(locale: Locale): string {
  return locale === "id" ? "id-ID" : "en-US";
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(
  mode: TimezoneMode,
  localTimeZone?: string,
): string {
  if (mode === "varun") {
    return VARUN_TIMEZONE;
  }

  const candidate =
    localTimeZone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (candidate && isValidTimeZone(candidate)) {
    return candidate;
  }

  return "UTC";
}

export function toDateKeyInTimeZone(
  isoOrDate: string | Date,
  timeZone: string,
): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date input: ${String(isoOrDate)}`);
  }

  const safeZone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to format date parts for timezone: ${safeZone}`);
  }

  return `${year}-${month}-${day}`;
}

export function formatTimestamp(
  iso: string,
  locale: Locale,
  timeZone: string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const safeZone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: safeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatMonthYear(dateKey: string, locale: Locale): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateKeyLabel(dateKey: string, locale: Locale): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateKeyWithWeekday(
  dateKey: string,
  locale: Locale,
): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRelativeTime(
  iso: string,
  locale: Locale,
  now: Date = new Date(),
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  if (diffMs < MS_PER_MINUTE) {
    return locale === "id" ? "baru saja" : "just now";
  }

  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale), {
    numeric: "auto",
  });

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.floor(diffMs / MS_PER_MINUTE);
    return rtf.format(-minutes, "minute");
  }

  if (diffMs < MS_PER_DAY) {
    const hours = Math.floor(diffMs / MS_PER_HOUR);
    return rtf.format(-hours, "hour");
  }

  const days = Math.floor(diffMs / MS_PER_DAY);
  return rtf.format(-days, "day");
}

export function formatShortMinutesAgo(
  iso: string,
  locale: Locale,
  now: Date = new Date(),
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  if (diffMs < MS_PER_MINUTE) {
    return locale === "id" ? "< 1 mnt lalu" : "< 1m ago";
  }

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.floor(diffMs / MS_PER_MINUTE);
    if (locale === "id") {
      return `${minutes} mnt lalu`;
    }
    return minutes === 1 ? "1 min ago" : `${minutes} mins ago`;
  }

  if (diffMs < MS_PER_DAY) {
    const hours = Math.floor(diffMs / MS_PER_HOUR);
    return locale === "id" ? `${hours} jam lalu` : `${hours}h ago`;
  }

  const days = Math.floor(diffMs / MS_PER_DAY);
  return locale === "id" ? `${days} hr lalu` : `${days}d ago`;
}

export function formatDaysMetric(days: number | null, locale: Locale): string {
  if (days === null || !Number.isFinite(days)) {
    return "—";
  }

  const formatted = days.toFixed(1);
  return locale === "id" ? `${formatted} hr` : `${formatted}d`;
}

export function formatGapBadge(
  gapDays: number | null,
  locale: Locale,
): string | null {
  if (gapDays === null || !Number.isFinite(gapDays)) {
    return null;
  }

  if (gapDays < 1) {
    return locale === "id" ? "<1 hr" : "<1d";
  }

  const rounded = Math.round(gapDays);
  return locale === "id" ? `+${rounded} hr` : `+${rounded}d`;
}
