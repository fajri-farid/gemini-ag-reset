import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "./datetime";
import type { Locale, TrackerMetrics } from "./types";

export const STORY_SAFE_ZONES = {
  top: 240,
  bottom: 300,
  contentTop: 240,
  contentBottom: 1620,
} as const;

export interface WaitingBarProgress {
  currentWaitDays: number;
  maxScaleDays: number;
  currentRatio: number;
  avgRatio: number | null;
}

/**
 * Computes visual bar ratios comparing the current wait duration against
 * average reset interval and longest recorded wait.
 */
export function computeWaitingBarProgress(
  resetAtIso: string,
  metrics: TrackerMetrics,
  now: Date,
): WaitingBarProgress {
  const resetMs = Date.parse(resetAtIso);
  const currentWaitDays = Number.isNaN(resetMs)
    ? 0
    : Math.max(0, (now.getTime() - resetMs) / MS_PER_DAY);

  const avgDays =
    metrics.avgIntervalDays !== null && metrics.avgIntervalDays > 0
      ? metrics.avgIntervalDays
      : null;
  const longestDays =
    metrics.longestWaitDays !== null && metrics.longestWaitDays > 0
      ? metrics.longestWaitDays
      : null;

  const maxScaleDays = Math.max(
    1,
    currentWaitDays,
    avgDays ?? 0,
    longestDays ?? 0,
  );

  return {
    currentWaitDays: Math.round(currentWaitDays * 10) / 10,
    maxScaleDays,
    currentRatio: Math.min(1, Math.max(0.06, currentWaitDays / maxScaleDays)),
    avgRatio:
      avgDays !== null
        ? Math.min(0.96, Math.max(0.08, avgDays / maxScaleDays))
        : null,
  };
}

/**
 * Formats X-style compact age next to `@_mohansolo · 6h` / `4d`.
 */
export function formatCompactTweetAge(
  iso: string,
  locale: Locale,
  now: Date,
): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }

  const diffMs = Math.max(0, now.getTime() - ms);
  if (diffMs < MS_PER_MINUTE) {
    return locale === "id" ? "baru" : "now";
  }
  if (diffMs < MS_PER_HOUR) {
    const mins = Math.floor(diffMs / MS_PER_MINUTE);
    return locale === "id" ? `${mins}m` : `${mins}m`;
  }
  if (diffMs < MS_PER_DAY) {
    const hours = Math.floor(diffMs / MS_PER_HOUR);
    return locale === "id" ? `${hours}j` : `${hours}h`;
  }
  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days < 30) {
    return locale === "id" ? `${days}h` : `${days}d`;
  }

  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

/**
 * Wraps multi-paragraph text into at most `maxLines` lines fitting `maxWidth`,
 * appending a clean ellipsis on overflow.
 */
export function wrapTextLines(
  text: string,
  maxLines: number,
  maxWidth: number,
  measureWidth: (candidate: string) => number,
): string[] {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((p) => p.trim());

  const lines: string[] = [];
  let truncated = false;

  const pushParagraph = (paragraph: string) => {
    if (lines.length >= maxLines) {
      truncated = true;
      return;
    }

    if (!paragraph) {
      if (lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      return;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = "";

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      const nextCandidate = currentLine ? `${currentLine} ${word}` : word;

      if (measureWidth(nextCandidate) <= maxWidth) {
        currentLine = nextCandidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
        if (lines.length >= maxLines) {
          truncated = true;
          return;
        }
        currentLine = "";
      }

      if (measureWidth(word) <= maxWidth) {
        currentLine = word;
      } else {
        // Hard-break very long tokens (e.g. URLs) cleanly.
        let chunk = "";
        for (const ch of Array.from(word)) {
          if (measureWidth(chunk + ch) <= maxWidth) {
            chunk += ch;
          } else {
            if (chunk) {
              lines.push(chunk);
              if (lines.length >= maxLines) {
                truncated = true;
                return;
              }
            }
            chunk = ch;
          }
        }
        currentLine = chunk;
      }
    }

    if (currentLine) {
      if (lines.length >= maxLines) {
        truncated = true;
      } else {
        lines.push(currentLine);
      }
    }
  };

  for (const paragraph of paragraphs) {
    if (lines.length >= maxLines) {
      if (paragraph) {
        truncated = true;
        break;
      }
      continue;
    }
    pushParagraph(paragraph);
  }

  // Trim trailing blank line if clamping ended on one.
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1].replace(/[.,!?;:\s]+$/, "");
    while (last.length > 1 && measureWidth(`${last}…`) > maxWidth) {
      last = Array.from(last).slice(0, -1).join("").trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}
