"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import {
  HOME_VISIBLE_NOTES,
  sortStickyNotes,
  type PublicNotesPage,
  type StickyNote,
} from "@/lib/sticky-notes";
import type { Locale } from "@/lib/types";
import { StickyNoteCard } from "./StickyNoteCard";
import { StickyNoteCelebration } from "./StickyNoteCelebration";
import { WriteNoteDialog } from "./WriteNoteDialog";

interface StickyNotesWallProps {
  initialNotesPage: PublicNotesPage;
  dict: Dictionary;
  locale: Locale;
  now: Date;
  isDialogOpen?: boolean;
  onOpenDialog?: () => void;
  onCloseDialog?: () => void;
  onTotalCountChange?: (nextTotal: number) => void;
}

export function StickyNotesWall({
  initialNotesPage,
  dict,
  locale,
  now,
  isDialogOpen: controlledOpen,
  onOpenDialog,
  onCloseDialog,
  onTotalCountChange,
}: StickyNotesWallProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [notes, setNotes] = useState<StickyNote[]>(initialNotesPage.items);
  const [totalCount, setTotalCount] = useState<number>(
    initialNotesPage.totalCount,
  );
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [justPostedNoteId, setJustPostedNoteId] = useState<string | null>(null);
  const [celebrationKey, setCelebrationKey] = useState(0);

  const isDialogOpen = controlledOpen ?? localDialogOpen;
  const openDialog = () => {
    setStatusMessage("");
    if (onOpenDialog) {
      onOpenDialog();
    } else {
      setLocalDialogOpen(true);
    }
  };
  const closeDialog = () => {
    if (onCloseDialog) {
      onCloseDialog();
    } else {
      setLocalDialogOpen(false);
    }
  };

  useEffect(() => {
    if (!justPostedNoteId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setJustPostedNoteId(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [justPostedNoteId]);

  const visibleNotes = notes.slice(0, HOME_VISIBLE_NOTES);

  function handleAddNote(note: StickyNote) {
    setNotes((prev) => sortStickyNotes([note, ...prev]));
    const nextTotal = totalCount + 1;
    setTotalCount(nextTotal);
    onTotalCountChange?.(nextTotal);
    setJustPostedNoteId(note.id);
    setCelebrationKey((prev) => prev + 1);
    setStatusMessage(dict.notes.postedFeedback);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    sectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <section
      id="community-notes"
      ref={sectionRef}
      aria-labelledby="community-notes-heading"
      className="scroll-mt-6 pt-2"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="community-notes-heading"
              className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl"
            >
              {dict.notes.title}
            </h2>
            <span className="rounded-md border border-ink bg-surface px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-ink">
              {totalCount} {dict.notes.noteCountUnit}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{dict.notes.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openDialog}
          className="neo-interactive inline-flex min-h-10 items-center gap-1.5 self-start bg-gemini-blue px-4 py-2 text-sm font-bold text-white hover:bg-gemini-blue-hover sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{dict.notes.writeCta}</span>
        </button>
      </div>

      <p
        role="status"
        className={
          statusMessage
            ? "note-toast-enter mb-4 inline-flex w-full items-center gap-2 rounded-lg border-2 border-ink bg-reset-live-bg px-3.5 py-2 text-xs font-bold text-ink shadow-[2px_2px_0px_#111111]"
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

      {visibleNotes.length === 0 ? (
        <div className="neo-card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-ink-muted">{dict.notes.emptyState}</p>
          <button
            type="button"
            onClick={openDialog}
            className="neo-interactive inline-flex items-center gap-1.5 bg-gemini-blue px-4 py-2 text-xs font-bold text-white hover:bg-gemini-blue-hover"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{dict.notes.writeCta}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleNotes.map((note, index) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                dict={dict}
                locale={locale}
                now={now}
                serialNumber={Math.max(1, totalCount - index)}
                isJustPosted={note.id === justPostedNoteId}
              />
            ))}
          </div>

          <div className="mt-5 flex justify-center">
            <Link
              href="/notes"
              className="neo-interactive inline-flex min-h-10 items-center gap-2 bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-gemini-tint"
            >
              <span>
                {dict.notes.viewAllCta} ({totalCount})
              </span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}

      <WriteNoteDialog
        open={isDialogOpen}
        onClose={closeDialog}
        onSubmitNote={handleAddNote}
        dict={dict}
        locale={locale}
        now={now}
        nextSerialNumber={totalCount + 1}
      />

      <StickyNoteCelebration burstKey={celebrationKey} />
    </section>
  );
}
