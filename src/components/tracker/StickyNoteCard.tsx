import {
  Clock,
  Flame,
  Heart,
  Lightbulb,
  MessageSquare,
  Pin,
  Sparkles,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import {
  STICKY_NOTE_COLOR_STYLES,
  type StickyNote,
  type StickyNoteMood,
} from "@/lib/sticky-notes";
import type { Locale } from "@/lib/types";

interface StickyNoteCardProps {
  note: StickyNote;
  dict: Dictionary;
  locale: Locale;
  now: Date;
  serialNumber?: number;
  isPreview?: boolean;
  isJustPosted?: boolean;
}

function MoodIcon({ mood }: { mood: StickyNoteMood }) {
  switch (mood) {
    case "thanks":
      return <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "feedback":
      return <MessageSquare className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "idea":
      return <Lightbulb className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "waiting":
      return <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "vibe":
      return <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />;
  }
}

function NoteBadges({
  note,
  dict,
  isJustPosted,
}: {
  note: StickyNote;
  dict: Dictionary;
  isJustPosted?: boolean;
}) {
  if (!note.isPinned && !note.mood && !isJustPosted) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isJustPosted && (
        <span className="inline-flex items-center gap-1 rounded-md border border-ink bg-reset-live px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-white">
          <Sparkles className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          <span>{dict.notes.justPostedBadge}</span>
        </span>
      )}
      {note.isPinned && (
        <span className="inline-flex items-center gap-1 rounded-md border border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
          <Pin className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          <span>{dict.notes.pinnedBadge}</span>
        </span>
      )}
      {note.mood && (
        <span className="inline-flex items-center gap-1 rounded-md border border-ink bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
          <MoodIcon mood={note.mood} />
          <span>{dict.notes.moods[note.mood]}</span>
        </span>
      )}
    </div>
  );
}

function MakerLoveBadge({
  lovedByMaker,
  label,
}: {
  lovedByMaker: boolean;
  label: string;
}) {
  if (!lovedByMaker) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
      <Heart
        className="h-3 w-3 shrink-0 fill-rose-500 text-rose-600"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

export function StickyNoteCard({
  note,
  dict,
  locale,
  now,
  serialNumber = 1,
  isPreview = false,
  isJustPosted = false,
}: StickyNoteCardProps) {
  const palette = STICKY_NOTE_COLOR_STYLES[note.color];
  const displayName =
    note.authorName.trim() || dict.notes.previewPlaceholderName;
  const displayMessage =
    note.message.trim() || dict.notes.previewPlaceholderMessage;
  const isNamePlaceholder = isPreview && note.authorName.trim().length === 0;
  const isMessagePlaceholder = isPreview && note.message.trim().length === 0;
  const relativeTime = formatRelativeTime(note.createdAt, locale, now);
  const serialTag = `#${String(serialNumber).padStart(2, "0")}`;
  const postedAccentClass = isJustPosted
    ? "note-card-land ring-4 ring-gemini-blue/55 ring-offset-2 ring-offset-canvas"
    : "";

  if (note.template === "lined-pad") {
    return (
      <article
        style={{ backgroundColor: palette.bg }}
        className={`relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-ink shadow-[4px_4px_0px_#111111] ${postedAccentClass}`}
      >
        <div
          style={{ backgroundColor: palette.headerBg }}
          className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-2.5"
        >
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas" />
            <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas" />
            <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas" />
            <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas" />
          </div>
          <NoteBadges note={note} dict={dict} isJustPosted={isJustPosted} />
        </div>

        <div className="note-lined-paper flex-1 px-4 py-3.5">
          <p
            className={`whitespace-pre-line break-words text-sm leading-7 ${
              isMessagePlaceholder ? "italic text-ink-muted" : "text-ink"
            }`}
          >
            {displayMessage}
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/20 bg-white/45 px-4 py-2.5">
          <div className="min-w-0">
            <p
              className={`truncate text-xs font-extrabold ${
                isNamePlaceholder ? "italic text-ink-muted" : "text-ink"
              }`}
            >
              {displayName}
            </p>
            <time
              dateTime={note.createdAt}
              className="block font-mono text-[11px] text-ink-muted"
            >
              {relativeTime}
            </time>
          </div>
          <MakerLoveBadge
            lovedByMaker={note.lovedByMaker}
            label={dict.notes.lovedByMakerBadge}
          />
        </footer>
      </article>
    );
  }

  if (note.template === "pixel-window") {
    return (
      <article
        style={{ backgroundColor: palette.bg }}
        className={`relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-ink shadow-[4px_4px_0px_#111111] ${postedAccentClass}`}
      >
        <div
          style={{ backgroundColor: palette.headerBg }}
          className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-3.5 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full border border-ink bg-surface" />
              <span className="h-2.5 w-2.5 rounded-full border border-ink bg-surface" />
              <span className="h-2.5 w-2.5 rounded-full border border-ink bg-ink" />
            </span>
            <span className="font-mono text-[11px] font-bold text-ink">
              note.txt
            </span>
          </div>
          <NoteBadges note={note} dict={dict} isJustPosted={isJustPosted} />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
          <div className="flex-1 rounded-lg border-2 border-ink bg-surface/85 p-3">
            <p
              className={`whitespace-pre-line break-words text-sm leading-relaxed ${
                isMessagePlaceholder ? "italic text-ink-muted" : "text-ink"
              }`}
            >
              {displayMessage}
            </p>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div className="min-w-0">
              <p
                className={`truncate font-mono text-xs font-extrabold ${
                  isNamePlaceholder ? "italic text-ink-muted" : "text-ink"
                }`}
              >
                @{displayName}
              </p>
              <time
                dateTime={note.createdAt}
                className="block font-mono text-[11px] text-ink-muted"
              >
                {relativeTime}
              </time>
            </div>
            <MakerLoveBadge
              lovedByMaker={note.lovedByMaker}
              label={dict.notes.lovedByMakerBadge}
            />
          </footer>
        </div>
      </article>
    );
  }

  if (note.template === "ticket-stub") {
    return (
      <article
        style={{ backgroundColor: palette.bg }}
        className={`relative flex h-full flex-col rounded-xl border-2 border-ink shadow-[4px_4px_0px_#111111] ${postedAccentClass}`}
      >
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              style={{ color: palette.accent }}
              className="font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              NOTE {serialTag}
            </span>
            <NoteBadges note={note} dict={dict} isJustPosted={isJustPosted} />
          </div>

          <p
            className={`whitespace-pre-line break-words text-sm leading-relaxed ${
              isMessagePlaceholder ? "italic text-ink-muted" : "text-ink"
            }`}
          >
            {displayMessage}
          </p>
        </div>

        <div className="relative border-t-2 border-dashed border-ink/60">
          <span
            aria-hidden="true"
            className="absolute -top-2 -left-2.5 h-4 w-4 rounded-full border-r-2 border-ink bg-canvas"
          />
          <span
            aria-hidden="true"
            className="absolute -top-2 -right-2.5 h-4 w-4 rounded-full border-l-2 border-ink bg-canvas"
          />
        </div>

        <footer
          style={{ backgroundColor: palette.headerBg }}
          className="flex flex-wrap items-center justify-between gap-2 rounded-b-[10px] px-4 py-2.5"
        >
          <div className="min-w-0">
            <p
              className={`truncate text-xs font-extrabold ${
                isNamePlaceholder ? "italic text-ink-muted" : "text-ink"
              }`}
            >
              {displayName}
            </p>
            <time
              dateTime={note.createdAt}
              className="block font-mono text-[11px] text-ink-muted"
            >
              {relativeTime}
            </time>
          </div>
          <MakerLoveBadge
            lovedByMaker={note.lovedByMaker}
            label={dict.notes.lovedByMakerBadge}
          />
        </footer>
      </article>
    );
  }

  if (note.template === "polaroid-pin") {
    return (
      <article
        style={{ backgroundColor: palette.bg }}
        className={`relative mt-2 flex h-full flex-col justify-between gap-3 rounded-xl border-2 border-ink p-3.5 pt-5 shadow-[4px_4px_0px_#111111] ${postedAccentClass}`}
      >
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-ink bg-surface shadow-[2px_2px_0px_#111111]"
        >
          <Pin className="h-3 w-3 text-ink" />
        </span>

        <div className="flex flex-1 flex-col gap-2.5 rounded-lg border-2 border-ink bg-surface p-3.5">
          <NoteBadges note={note} dict={dict} isJustPosted={isJustPosted} />
          <p
            className={`whitespace-pre-line break-words text-sm leading-relaxed ${
              isMessagePlaceholder ? "italic text-ink-muted" : "text-ink"
            }`}
          >
            {displayMessage}
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="min-w-0">
            <p
              className={`truncate text-xs font-extrabold ${
                isNamePlaceholder ? "italic text-ink-muted" : "text-ink"
              }`}
            >
              {displayName}
            </p>
            <time
              dateTime={note.createdAt}
              className="block font-mono text-[11px] text-ink-muted"
            >
              {relativeTime}
            </time>
          </div>
          <MakerLoveBadge
            lovedByMaker={note.lovedByMaker}
            label={dict.notes.lovedByMakerBadge}
          />
        </footer>
      </article>
    );
  }

  return (
    <article
      style={{ backgroundColor: palette.bg }}
      className={`relative mt-2 flex h-full flex-col justify-between gap-4 rounded-xl border-2 border-ink p-4 pt-5 shadow-[4px_4px_0px_#111111] ${postedAccentClass}`}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 h-4 w-16 -translate-x-1/2 -rotate-2 rounded-sm border-2 border-ink bg-white/85 shadow-[1px_1px_0px_#111111]"
      />

      <div className="flex flex-col gap-2.5">
        <NoteBadges note={note} dict={dict} isJustPosted={isJustPosted} />
        <p
          className={`whitespace-pre-line break-words text-sm leading-relaxed ${
            isMessagePlaceholder ? "italic text-ink-muted" : "text-ink"
          }`}
        >
          {displayMessage}
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/15 pt-2.5">
        <div className="min-w-0">
          <p
            className={`truncate text-xs font-extrabold ${
              isNamePlaceholder ? "italic text-ink-muted" : "text-ink"
            }`}
          >
            {displayName}
          </p>
          <time
            dateTime={note.createdAt}
            className="block font-mono text-[11px] text-ink-muted"
          >
            {relativeTime}
          </time>
        </div>
        <MakerLoveBadge
          lovedByMaker={note.lovedByMaker}
          label={dict.notes.lovedByMakerBadge}
        />
      </footer>
    </article>
  );
}
