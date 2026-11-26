import { toDateKeyInTimeZone } from "./datetime";
import { sortResetsDescending } from "./metrics";
import type {
  DynamicHeatmapData,
  HeatmapCell,
  HeatmapWeek,
  Locale,
  ResetRecord,
} from "./types";

const DEFAULT_MAX_WEEKS = 52;

function parseDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new RangeError(`Invalid dateKey: ${dateKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatUtcDateKey(date);
}

/**
 * Mengembalikan indeks hari ISO: Senin = 0 ... Minggu = 6.
 */
function getIsoWeekday(dateKey: string): number {
  const utcDay = parseDateKey(dateKey).getUTCDay();
  return (utcDay + 6) % 7;
}

function startOfIsoWeek(dateKey: string): string {
  return addDaysToDateKey(dateKey, -getIsoWeekday(dateKey));
}

function endOfIsoWeek(dateKey: string): string {
  return addDaysToDateKey(dateKey, 6 - getIsoWeekday(dateKey));
}

function formatShortMonth(dateKey: string, locale: Locale): string {
  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: "UTC",
    month: "short",
  }).format(parseDateKey(dateKey));
}

export interface BuildDynamicHeatmapOptions {
  resets: readonly ResetRecord[];
  trackingStartedAt: string;
  timeZone: string;
  locale?: Locale;
  now?: Date;
  maxWeeks?: number;
}

export function buildDynamicHeatmap({
  resets,
  trackingStartedAt,
  timeZone,
  locale = "en",
  now = new Date(),
  maxWeeks = DEFAULT_MAX_WEEKS,
}: BuildDynamicHeatmapOptions): DynamicHeatmapData {
  const todayKey = toDateKeyInTimeZone(now, timeZone);
  const descendingResets = sortResetsDescending(resets);
  const resetsByDate = new Map<string, ResetRecord[]>();

  let earliestResetKey: string | null = null;
  for (const record of descendingResets) {
    const key = toDateKeyInTimeZone(record.resetAt, timeZone);
    const list = resetsByDate.get(key);
    if (list) {
      list.push(record);
    } else {
      resetsByDate.set(key, [record]);
    }
    if (!earliestResetKey || key < earliestResetKey) {
      earliestResetKey = key;
    }
  }

  let trackingStartKey = toDateKeyInTimeZone(trackingStartedAt, timeZone);
  if (earliestResetKey && earliestResetKey < trackingStartKey) {
    trackingStartKey = earliestResetKey;
  }
  if (trackingStartKey > todayKey) {
    trackingStartKey = todayKey;
  }

  let rangeStartKey = startOfIsoWeek(trackingStartKey);
  const rangeEndKey = endOfIsoWeek(todayKey);

  const safeMaxWeeks = Math.max(1, maxWeeks);
  const currentWeekStartKey = startOfIsoWeek(todayKey);
  const minAllowedStartKey = addDaysToDateKey(
    currentWeekStartKey,
    -(safeMaxWeeks - 1) * 7,
  );
  if (rangeStartKey < minAllowedStartKey) {
    rangeStartKey = minAllowedStartKey;
  }

  const weeks: HeatmapWeek[] = [];
  let cursorWeekStart = rangeStartKey;
  let totalResetDays = 0;

  while (cursorWeekStart <= rangeEndKey) {
    const cells: HeatmapCell[] = [];
    let monthTransitionKey: string | null = null;

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const dateKey = addDaysToDateKey(cursorWeekStart, dayOffset);
      if (dateKey.endsWith("-01")) {
        monthTransitionKey = dateKey;
      }

      const dayResets = resetsByDate.get(dateKey) ?? [];
      const hasReset = dayResets.length > 0;
      const inTrackingRange =
        dateKey >= trackingStartKey && dateKey <= todayKey;

      if (hasReset && inTrackingRange) {
        totalResetDays += 1;
      }

      cells.push({
        dateKey,
        inTrackingRange,
        isFuture: dateKey > todayKey,
        isToday: dateKey === todayKey,
        hasReset,
        resets: dayResets,
      });
    }

    const monthLabel =
      weeks.length === 0
        ? formatShortMonth(cells[0].dateKey, locale)
        : monthTransitionKey
          ? formatShortMonth(monthTransitionKey, locale)
          : null;

    weeks.push({
      weekStartKey: cursorWeekStart,
      monthLabel,
      cells,
    });

    cursorWeekStart = addDaysToDateKey(cursorWeekStart, 7);
  }

  return {
    trackingStartKey,
    rangeStartKey,
    rangeEndKey,
    totalWeeks: weeks.length,
    totalResetDays,
    weeks,
  };
}
