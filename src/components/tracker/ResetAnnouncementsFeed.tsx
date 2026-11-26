import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { formatGapBadge, formatTimestamp } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, ResetFeedPage } from "@/lib/types";

interface ResetAnnouncementsFeedProps {
  initialPage: ResetFeedPage;
  dict: Dictionary;
  locale: Locale;
  timeZone: string;
}

function focusAnnouncement(element: HTMLLIElement | null) {
  element?.focus();
}

export function ResetAnnouncementsFeed({
  initialPage,
  dict,
  locale,
  timeZone,
}: ResetAnnouncementsFeedProps) {
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const loadMoreButton = useRef<HTMLButtonElement>(null);

  async function loadMore() {
    if (isLoading || !page.nextCursor) {
      return;
    }

    setIsLoading(true);
    setHasError(false);
    try {
      const query = new URLSearchParams({ ...page.nextCursor });
      const response = await fetch(`/api/resets/feed?${query}`);
      if (!response.ok) {
        setHasError(true);
        return;
      }

      const nextPage: ResetFeedPage = await response.json();
      const loadedIds = new Set(page.items.map((item) => item.tweetId));
      const newItems = nextPage.items.filter((item) => !loadedIds.has(item.tweetId));
      if (document.activeElement === loadMoreButton.current) {
        setFocusId(newItems[0]?.tweetId ?? null);
      }
      setPage({ items: [...page.items, ...newItems], nextCursor: nextPage.nextCursor });
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

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

      {page.items.length === 0 ? (
        <div className="neo-card p-6 text-center text-sm text-ink-muted">
          {dict.feed.emptyState}
        </div>
      ) : (
        <ol id="announcements-list" className="flex flex-col gap-4">
          {page.items.map((item) => {
            const formattedDate = formatTimestamp(
              item.resetAt,
              locale,
              timeZone,
            );
            const gapBadge = formatGapBadge(item.gapMinutesFromPrevious, locale);

            return (
              <li
                key={item.tweetId}
                ref={item.tweetId === focusId ? focusAnnouncement : undefined}
                tabIndex={-1}
                className="neo-card p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <time
                      dateTime={item.resetAt}
                      className="font-mono text-xs font-medium text-ink-muted"
                    >
                      {formattedDate}
                    </time>
                    {gapBadge && (
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className="text-ink-muted"> · </span>
                        <span className="rounded-md border border-ink bg-gemini-violet/10 px-2 py-0.5 font-mono text-xs font-bold text-gemini-violet">
                          {gapBadge}
                        </span>
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

      {page.nextCursor && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            ref={loadMoreButton}
            type="button"
            aria-controls="announcements-list"
            aria-disabled={isLoading}
            onClick={() => void loadMore()}
            className="neo-interactive inline-flex min-h-11 items-center gap-2 bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-gemini-tint aria-disabled:cursor-wait aria-disabled:opacity-70"
          >
            {isLoading ? dict.feed.loadingMore : dict.feed.loadMore}
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          <p role="status" className={hasError ? "text-center text-sm text-danger" : "sr-only"}>
            {hasError ? dict.feed.loadError : isLoading ? dict.feed.loadingMore : ""}
          </p>
        </div>
      )}
    </section>
  );
}
