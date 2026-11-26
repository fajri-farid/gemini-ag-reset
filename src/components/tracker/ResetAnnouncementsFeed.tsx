import { ArrowUpRight } from "lucide-react";
import { formatGapBadge, formatTimestamp } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import { computeFeedIntervals } from "@/lib/metrics";
import type { Locale, ResetRecord } from "@/lib/types";

interface ResetAnnouncementsFeedProps {
  resets: readonly ResetRecord[];
  dict: Dictionary;
  locale: Locale;
  timeZone: string;
}

export function ResetAnnouncementsFeed({
  resets,
  dict,
  locale,
  timeZone,
}: ResetAnnouncementsFeedProps) {
  const feedItems = computeFeedIntervals(resets);

  return (
    <section aria-labelledby="announcements-heading">
      <div className="mb-4">
        <h2
          id="announcements-heading"
          className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl"
        >
          {dict.feed.title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{dict.feed.subtitle}</p>
      </div>

      {feedItems.length === 0 ? (
        <div className="neo-card p-6 text-center text-sm text-ink-muted">
          {dict.feed.emptyState}
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {feedItems.map((item) => {
            const formattedDate = formatTimestamp(
              item.resetAt,
              locale,
              timeZone,
            );
            const gapBadge = formatGapBadge(item.gapDaysFromPrevious, locale);

            return (
              <li key={item.tweetId} className="neo-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <time
                      dateTime={item.resetAt}
                      className="font-mono text-xs font-medium text-ink-muted"
                    >
                      {formattedDate}
                    </time>
                    {gapBadge && (
                      <span className="rounded-md border border-ink bg-gemini-violet/10 px-2 py-0.5 font-mono text-xs font-bold text-gemini-violet">
                        {gapBadge}
                      </span>
                    )}
                  </div>

                  <a
                    href={item.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold text-gemini-blue hover:text-gemini-violet"
                  >
                    <span>
                      {dict.feed.viewOnX}
                      <span className="sr-only"> ({formattedDate})</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink sm:text-base">
                  {item.tweetText}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
