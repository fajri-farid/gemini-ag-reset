import { describe, expect, it } from "vitest";
import {
  formatDateKeyLabel,
  formatDateKeyWithWeekday,
  formatDaysMetric,
  formatGapBadge,
  formatMonthYear,
  formatRelativeTime,
  formatShortMinutesAgo,
  formatTimestamp,
  resolveTimeZone,
  toDateKeyInTimeZone,
} from "../datetime";
import { getDictionary, parseLocale } from "../i18n";
import { buildCanonicalTweetUrl, extractTweetIdFromUrl } from "../tweet-url";

describe("tweet-url helpers", () => {
  it("extracts numeric tweet IDs from x.com, twitter.com, query strings, and raw IDs", () => {
    expect(
      extractTweetIdFromUrl("https://x.com/_mohansolo/status/1861234567890123456"),
    ).toBe("1861234567890123456");
    expect(
      extractTweetIdFromUrl(
        "https://twitter.com/_mohansolo/status/1861234567890123456?s=20&t=abc",
      ),
    ).toBe("1861234567890123456");
    expect(
      extractTweetIdFromUrl(
        "https://mobile.x.com/_mohansolo/status/1861234567890123456/photo/1",
      ),
    ).toBe("1861234567890123456");
    expect(extractTweetIdFromUrl("1861234567890123456")).toBe(
      "1861234567890123456",
    );
  });

  it("rejects non-X domains and invalid inputs", () => {
    expect(
      extractTweetIdFromUrl(
        "https://example.com/_mohansolo/status/1861234567890123456",
      ),
    ).toBeNull();
    expect(extractTweetIdFromUrl("https://x.com/_mohansolo")).toBeNull();
    expect(extractTweetIdFromUrl("not-a-url")).toBeNull();
  });

  it("builds canonical x.com URL for @_mohansolo", () => {
    expect(buildCanonicalTweetUrl("1861234567890123456")).toBe(
      "https://x.com/_mohansolo/status/1861234567890123456",
    );
  });
});

describe("datetime & timezone helpers", () => {
  it("resolves varun PT and local timezones with safe fallback", () => {
    expect(resolveTimeZone("varun")).toBe("America/Los_Angeles");
    expect(resolveTimeZone("local", "Asia/Makassar")).toBe("Asia/Makassar");
    expect(resolveTimeZone("local", "Invalid/Zone_Name")).toBe("UTC");
  });

  it("formats timestamps, date keys, relative times, and metrics in EN and ID", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");

    expect(
      toDateKeyInTimeZone("2026-11-26T04:00:00.000Z", "America/Los_Angeles"),
    ).toBe("2026-11-25");

    const tsEn = formatTimestamp(
      "2026-11-26T12:00:00.000Z",
      "en",
      "America/Los_Angeles",
    );
    expect(tsEn).toContain("Nov");
    expect(tsEn).toContain("2026");

    expect(formatMonthYear("2026-11-01", "en")).toContain("2026");
    expect(formatDateKeyLabel("2026-11-26", "en")).toContain("26");
    expect(formatDateKeyWithWeekday("2026-11-26", "en")).toContain("Thu");
    expect(formatDateKeyWithWeekday("2026-11-26", "id")).toContain("26");
    expect(formatDateKeyWithWeekday("invalid-key", "en")).toBe("invalid-key");

    expect(formatRelativeTime("2026-11-26T11:59:45.000Z", "en", now)).toBe(
      "just now",
    );
    expect(formatRelativeTime("2026-11-26T11:59:45.000Z", "id", now)).toBe(
      "baru saja",
    );
    expect(
      formatRelativeTime("2026-11-26T10:00:00.000Z", "en", now),
    ).toContain("2");

    expect(formatShortMinutesAgo("2026-11-26T11:46:00.000Z", "en", now)).toBe(
      "14 mins ago",
    );
    expect(formatShortMinutesAgo("2026-11-26T11:46:00.000Z", "id", now)).toBe(
      "14 mnt lalu",
    );

    expect(formatDaysMetric(null, "en")).toBe("—");
    expect(formatDaysMetric(6, "en")).toBe("6.0d");
    expect(formatDaysMetric(6, "id")).toBe("6.0 hr");

    expect(formatGapBadge(null, "en")).toBeNull();
    expect(formatGapBadge(0, "en")).toBe("Same minute");
    expect(formatGapBadge(58, "en")).toBe("58 minutes apart");
    expect(formatGapBadge(3543, "en")).toBe("2 days, 11 hours, 3 minutes apart");
    expect(formatGapBadge(3543, "id")).toBe("Jeda 2 hari, 11 jam, 3 menit");
  });
});

describe("i18n dictionaries", () => {
  it("parses locale codes safely", () => {
    expect(parseLocale(undefined)).toBe("en");
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("id")).toBe("id");
    expect(parseLocale("id-ID")).toBe("id");
    expect(parseLocale("fr")).toBe("en");
  });

  it("keeps identical structure and non-empty strings across EN and ID", () => {
    const en = getDictionary("en");
    const id = getDictionary("id");

    expect(Object.keys(en)).toEqual(Object.keys(id));
    expect(en.heatmap.weekdaysShort).toHaveLength(7);
    expect(id.heatmap.weekdaysShort).toHaveLength(7);
    expect(en.heatmap.todayBadge).toBe("Today");
    expect(id.heatmap.todayBadge).toBe("Hari ini");
    expect(en.heatmap.legendToday).toBeTruthy();
    expect(id.heatmap.legendToday).toBeTruthy();
    expect(en.heatmap.upcomingLabel).toBeTruthy();
    expect(id.heatmap.upcomingLabel).toBeTruthy();
    expect(en.heatmap.resetsCountUnit).toBeTruthy();
    expect(id.heatmap.resetsCountUnit).toBeTruthy();
    expect(id.hero.resetRecentlyBadge).toBeTruthy();
    expect(en.hero.resetRecentlyBadge).toBe("RESET RECENTLY");
  });
});
