"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Plus,
  StickyNote as StickyNoteIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

interface FloatingNotesDockProps {
  noteCount: number;
  dict: Dictionary;
  onJumpToNotes: () => void;
  onOpenWriteDialog: () => void;
}

export function FloatingNotesDock({
  noteCount,
  dict,
  onJumpToNotes,
  onOpenWriteDialog,
}: FloatingNotesDockProps) {
  return (
    <>
      <nav
        aria-label={dict.notes.quickDockLabel}
        className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 xl:flex"
      >
        <div className="relative flex w-40 flex-col gap-2 rounded-xl border-2 border-ink bg-[#FEF3C7] p-3 pt-4 shadow-[4px_4px_0px_#111111]">
          <span
            aria-hidden="true"
            className="absolute -top-2 left-1/2 h-3.5 w-12 -translate-x-1/2 -rotate-2 rounded-sm border-2 border-ink bg-white/85 shadow-[1px_1px_0px_#111111]"
          />

          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-extrabold text-ink">
              <StickyNoteIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{dict.footer.notesLink}</span>
            </span>
            <span className="rounded-md border border-ink bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-ink">
              {noteCount}
            </span>
          </div>

          <button
            type="button"
            onClick={onJumpToNotes}
            className="neo-interactive inline-flex items-center justify-center gap-1.5 bg-surface px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-gemini-tint"
          >
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{dict.notes.quickJumpCta}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWriteDialog}
            className="neo-interactive inline-flex items-center justify-center gap-1.5 bg-gemini-blue px-2.5 py-1.5 text-xs font-bold text-white hover:bg-gemini-blue-hover"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{dict.notes.quickWriteCta}</span>
          </button>

          <Link
            href="/notes"
            className="inline-flex items-center justify-center gap-1 pt-0.5 font-mono text-[11px] font-bold text-ink underline decoration-ink/40 underline-offset-2 hover:text-gemini-blue"
          >
            <span>{dict.notes.quickAllCta}</span>
            <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </nav>

      <div className="fixed right-4 bottom-4 z-30 flex items-center gap-2 xl:hidden">
        <button
          type="button"
          onClick={onJumpToNotes}
          aria-label={dict.notes.quickJumpCta}
          className="neo-interactive inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3.5 py-2 font-mono text-xs font-bold text-ink shadow-[3px_3px_0px_#111111]"
        >
          <StickyNoteIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{dict.footer.notesLink}</span>
          <span className="rounded border border-ink bg-surface px-1 text-[10px] tabular-nums">
            {noteCount}
          </span>
          <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
