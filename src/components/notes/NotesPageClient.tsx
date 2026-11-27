"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  Plus,
  Sparkles,
} from "lucide-react";
import { StickyNoteCard } from "@/components/tracker/StickyNoteCard";
import { StickyNoteCelebration } from "@/components/tracker/StickyNoteCelebration";
import { TrackerFooter } from "@/components/tracker/TrackerFooter";
import { WriteNoteDialog } from "@/components/tracker/WriteNoteDialog";
import {
  getClientLocaleSnapshot,
  getServerLocaleSnapshot,
  setClientLocalePreference,
  subscribePrefs,
} from "@/lib/client-prefs";
import { MS_PER_MINUTE } from "@/lib/datetime";
import { getDictionary } from "@/lib/i18n";
import {
  noteCursorParams,
  STICKY_NOTE_MOODS,
  sortStickyNotes,
  type PublicNotesPage,
  type StickyNote,
  type StickyNoteMood,
} from "@/lib/sticky-notes";
import type { Locale } from "@/lib/types";

type NotesFilter = "all" | "loved" | StickyNoteMood;

interface NotesPageClientProps {
  initialPage: PublicNotesPage;
  generatedAt: string;
}

export function NotesPageClient({
  initialPage,
  generatedAt,
}: NotesPageClientProps) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [page, setPage] = useState<PublicNotesPage>(initialPage);
  const [filter, setFilter] = useState<NotesFilter>("all");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [justPostedNoteId, setJustPostedNoteId] = useState<string | null>(null);
  const [celebrationKey, setCelebrationKey] = useState(0);

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

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    const initialUpdate = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, MS_PER_MINUTE);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!justPostedNoteId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setJustPostedNoteId(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [justPostedNoteId]);

  const handleLocaleChange = (nextLocale: Locale) => {
    setClientLocalePreference(nextLocale);
  };

  const dict = getDictionary(locale);
  const referenceNow = new Date(currentTime ?? generatedAt);

  async function loadNotes(nextFilter: NotesFilter, append = false, posted?: StickyNote) {
    const cursor = append ? page.nextCursor : null;
    if (append && (requestRef.current || !cursor)) return;

    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    setIsLoadingMore(true);
    setLoadError(false);
    if (!append) {
      setFilter(nextFilter);
      setPage((prev) => ({ ...prev, items: posted ? [posted] : [], nextCursor: null }));
    }
    try {
      const params = cursor ? noteCursorParams(cursor) : new URLSearchParams();
      if (nextFilter === "loved") params.set("loved", "1");
      else if (nextFilter !== "all") params.set("mood", nextFilter);
      const response = await fetch("/api/notes?" + params, { signal: request.signal });
      if (!response.ok) throw new Error("Unable to load notes.");
      const nextPage = (await response.json()) as PublicNotesPage;
      if (request.signal.aborted) return;
      setPage((prev) => {
        if (!append) return posted && !nextPage.items.some(({ id }) => id === posted.id)
          ? { ...nextPage, items: sortStickyNotes([posted, ...nextPage.items]) }
          : nextPage;
        const seen = new Set(prev.items.map((item) => item.id));
        return { ...nextPage, items: [...prev.items, ...nextPage.items.filter((item) => !seen.has(item.id))] };
      });
    } catch {
      if (!request.signal.aborted) setLoadError(true);
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setIsLoadingMore(false);
      }
    }
  }

  function handleAddNote(note: StickyNote) {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsLoadingMore(false);
    setLoadError(false);
    if (filter !== "all") {
      void loadNotes("all", false, note);
    } else setPage((prev) => prev.items.some(({ id }) => id === note.id) ? prev : ({
      items: sortStickyNotes([note, ...prev.items]),
      nextCursor: prev.nextCursor,
      totalCount: prev.totalCount + 1,
    }));
    setFilter("all");
    setJustPostedNoteId(note.id);
    setCelebrationKey((prev) => prev + 1);
    setStatusMessage(dict.notes.postedFeedback);
  }

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
            <span>{dict.notes.backToTracker}</span>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {dict.notes.allPageTitle}
              </h1>
              <span className="rounded-md border border-ink bg-surface px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-ink">
                {page.totalCount} {dict.notes.noteCountUnit}
              </span>
            </div>
            <p className="mt-2 text-base leading-relaxed text-ink-muted sm:text-lg">
              {dict.notes.allPageSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusMessage("");
              setIsDialogOpen(true);
            }}
            className="neo-interactive inline-flex min-h-10 items-center gap-1.5 self-start bg-gemini-blue px-4 py-2 text-sm font-bold text-white hover:bg-gemini-blue-hover sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{dict.notes.writeCta}</span>
          </button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex flex-col gap-5">
        <div
          role="group"
          aria-label={dict.notes.moodLabel}
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => void loadNotes("all")}
            className={`neo-interactive px-3 py-1.5 font-mono text-xs font-bold ${
              filter === "all"
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            {dict.notes.filterAll} ({page.totalCount})
          </button>

          <button
            type="button"
            aria-pressed={filter === "loved"}
            onClick={() => void loadNotes("loved")}
            className={`neo-interactive inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold ${
              filter === "loved"
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            <Heart
              className="h-3.5 w-3.5 fill-rose-500 text-rose-600"
              aria-hidden="true"
            />
            <span>{dict.notes.filterLoved}</span>
          </button>

          {STICKY_NOTE_MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              aria-pressed={filter === mood}
              onClick={() => void loadNotes(mood)}
              className={`neo-interactive px-3 py-1.5 font-mono text-xs font-bold ${
                filter === mood
                  ? "bg-gemini-violet text-white"
                  : "bg-surface text-ink hover:bg-gemini-tint"
              }`}
            >
              {dict.notes.moods[mood]}
            </button>
          ))}
        </div>

        <p
          role="status"
          className={
            statusMessage
              ? "note-toast-enter inline-flex w-full items-center gap-2 rounded-lg border-2 border-ink bg-reset-live-bg px-3.5 py-2 text-xs font-bold text-ink shadow-[2px_2px_0px_#111111]"
              : "sr-only"
          }
        >
          {statusMessage && (
            <Sparkles
              className="h-4 w-4 shrink-0 text-reset-live"
              aria-hidden="true"
            />
          )}
          <span>{statusMessage}</span>
        </p>

        {page.items.length === 0 && isLoadingMore ? (
          <p role="status" className="text-center text-sm text-ink-muted">{dict.notes.loadingMore}</p>
        ) : page.items.length === 0 && loadError ? (
          <div className="flex flex-col items-center gap-2">
            <p role="status" className="text-sm text-danger">{dict.notes.loadError}</p>
            <button type="button" className="neo-interactive px-3 py-2" onClick={() => void loadNotes(filter)}>
              {dict.notes.loadMore}
            </button>
          </div>
        ) : page.items.length === 0 && filter === "all" ? (
          <div className="neo-card flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-ink-muted">{dict.notes.emptyState}</p>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="neo-interactive inline-flex items-center gap-1.5 bg-gemini-blue px-4 py-2 text-xs font-bold text-white hover:bg-gemini-blue-hover"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{dict.notes.writeCta}</span>
            </button>
          </div>
        ) : page.items.length === 0 ? (
          <div className="neo-card flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-ink-muted">{dict.notes.filterEmpty}</p>
            <button
              type="button"
              onClick={() => void loadNotes("all")}
              className="neo-interactive bg-surface px-4 py-2 font-mono text-xs font-bold text-ink hover:bg-gemini-tint"
            >
              {dict.notes.clearFilter}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {page.items.map((note, index) => (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  dict={dict}
                  locale={locale}
                  now={referenceNow}
                  serialNumber={Math.max(1, page.items.length - index)}
                  isJustPosted={note.id === justPostedNoteId}
                />
              ))}
            </div>

            {page.nextCursor && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  aria-disabled={isLoadingMore}
                  onClick={() => void loadNotes(filter, true)}
                  className="neo-interactive inline-flex min-h-11 items-center gap-2 bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-gemini-tint aria-disabled:cursor-wait aria-disabled:opacity-70"
                >
                  <span>
                    {isLoadingMore
                      ? dict.notes.loadingMore
                      : dict.notes.loadMore}
                  </span>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                {loadError && (
                  <p role="status" className="text-center text-sm text-danger">
                    {dict.notes.loadError}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <WriteNoteDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmitNote={handleAddNote}
        dict={dict}
        locale={locale}
        now={referenceNow}
        nextSerialNumber={page.totalCount + 1}
      />

      <StickyNoteCelebration burstKey={celebrationKey} />

      <TrackerFooter
        dict={dict}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        currentPath="/notes"
      />
    </div>
  );
}
