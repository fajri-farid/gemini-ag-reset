"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Heart,
  Pin,
  Save,
  Trash2,
} from "lucide-react";
import type { UpdateAdminNoteInput } from "@/lib/admin-api";
import { formatTimestamp } from "@/lib/datetime";
import {
  STICKY_NOTE_COLOR_STYLES,
  sortStickyNotes,
  type SiteStats,
  type StickyNote,
} from "@/lib/sticky-notes";

interface AdminNotesManagerProps {
  notes: StickyNote[];
  stats: SiteStats | null;
  onUpdateNote: (noteId: string, input: UpdateAdminNoteInput) => Promise<void>;
  onReorderPinned: (orderedIds: readonly string[], expectedOrder: readonly string[]) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export function AdminNotesManager({
  notes,
  stats,
  onUpdateNote,
  onReorderPinned,
  onDeleteNote,
}: AdminNotesManagerProps) {
  const sortedNotes = useMemo(() => sortStickyNotes(notes), [notes]);
  const serverPinnedNotes = useMemo(
    () => sortedNotes.filter((note) => note.isPinned),
    [sortedNotes],
  );
  const unpinnedNotes = useMemo(
    () => sortedNotes.filter((note) => !note.isPinned),
    [sortedNotes],
  );

  const [draftPinnedOrder, setDraftPinnedOrder] = useState<string[] | null>(
    null,
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [pendingDeleteNote, setPendingDeleteNote] = useState<StickyNote | null>(
    null,
  );
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (pendingDeleteNote && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [pendingDeleteNote]);

  const pinnedNotes = useMemo(() => {
    if (!draftPinnedOrder) {
      return serverPinnedNotes;
    }

    const byId = new Map(serverPinnedNotes.map((note) => [note.id, note]));
    const ordered: StickyNote[] = [];
    for (const id of draftPinnedOrder) {
      const found = byId.get(id);
      if (found) {
        ordered.push(found);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) {
      ordered.push(remaining);
    }
    return ordered;
  }, [draftPinnedOrder, serverPinnedNotes]);

  const isOrderDirty = useMemo(() => {
    if (!draftPinnedOrder) {
      return false;
    }
    if (pinnedNotes.length !== serverPinnedNotes.length) {
      return true;
    }
    return pinnedNotes.some(
      (note, index) => note.id !== serverPinnedNotes[index]?.id,
    );
  }, [draftPinnedOrder, pinnedNotes, serverPinnedNotes]);

  function movePinnedItem(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= pinnedNotes.length ||
      toIndex >= pinnedNotes.length
    ) {
      return;
    }

    const nextIds = pinnedNotes.map((note) => note.id);
    const [moved] = nextIds.splice(fromIndex, 1);
    if (!moved) {
      return;
    }
    nextIds.splice(toIndex, 0, moved);
    setDraftPinnedOrder(nextIds);
  }

  async function handleSaveOrder() {
    if (!isOrderDirty || isSavingOrder) {
      return;
    }

    setIsSavingOrder(true);
    try {
      await onReorderPinned(
        pinnedNotes.map((note) => note.id),
        serverPinnedNotes.map((note) => note.id),
      );
      setDraftPinnedOrder(null);
    } finally {
      setIsSavingOrder(false);
    }
  }

  async function handleToggle(noteId: string, patch: UpdateAdminNoteInput) {
    setBusyNoteId(noteId);
    try {
      await onUpdateNote(noteId, patch);
      if (patch.isPinned !== undefined) {
        setDraftPinnedOrder(null);
      }
    } finally {
      setBusyNoteId((current) => (current === noteId ? null : current));
    }
  }

  function handleDialogClose(event: React.SyntheticEvent<HTMLDialogElement>) {
    const dialog = event.currentTarget;
    const decision = dialog.returnValue;
    dialog.returnValue = "";

    const target = pendingDeleteNote;
    setPendingDeleteNote(null);

    if (decision === "delete" && target) {
      setBusyNoteId(target.id);
      void onDeleteNote(target.id).finally(() => {
        setDraftPinnedOrder(null);
        setBusyNoteId((current) => (current === target.id ? null : current));
      });
    }
  }

  function renderNoteRow(note: StickyNote, pinnedIndex?: number) {
    const palette = STICKY_NOTE_COLOR_STYLES[note.color];
    const isBusy = busyNoteId === note.id;
    const isDraggable = typeof pinnedIndex === "number";
    const isBeingDragged = draggingId === note.id;
    const isDropTarget = dragOverId === note.id && draggingId !== note.id;

    return (
      <li
        key={note.id}
        draggable={isDraggable}
        onDragStart={() => {
          if (isDraggable) {
            setDraggingId(note.id);
          }
        }}
        onDragOver={(event) => {
          if (!isDraggable) {
            return;
          }
          event.preventDefault();
          if (dragOverId !== note.id) {
            setDragOverId(note.id);
          }
        }}
        onDrop={(event) => {
          if (!isDraggable || !draggingId) {
            return;
          }
          event.preventDefault();
          const fromIdx = pinnedNotes.findIndex(
            (item) => item.id === draggingId,
          );
          if (fromIdx !== -1) {
            movePinnedItem(fromIdx, pinnedIndex);
          }
          setDraggingId(null);
          setDragOverId(null);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
        }}
        className={`rounded-xl border-2 border-ink bg-surface p-4 transition-opacity ${
          isBeingDragged ? "opacity-55" : ""
        } ${
          isDropTarget
            ? "ring-2 ring-gemini-blue ring-offset-2 ring-offset-surface"
            : ""
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {isDraggable && (
              <div className="mt-0.5 flex flex-col items-center gap-1">
                <span
                  title="Drag to reorder"
                  className="inline-flex cursor-grab items-center justify-center rounded border border-ink/30 bg-canvas p-1 text-ink-muted active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] font-bold text-ink-muted">
                  #{pinnedIndex + 1}
                </span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  style={{ backgroundColor: palette.swatch }}
                  className="h-3 w-3 shrink-0 rounded-xs border border-ink"
                  aria-hidden="true"
                />
                <span className="text-sm font-extrabold text-ink">
                  {note.authorName}
                </span>
                <span className="rounded border border-ink/30 bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-muted">
                  {note.template}
                </span>
                {note.mood && (
                  <span className="rounded border border-ink/30 bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">
                    {note.mood}
                  </span>
                )}
                <time
                  dateTime={note.createdAt}
                  className="font-mono text-[11px] text-ink-muted"
                >
                  {formatTimestamp(note.createdAt, "en", "UTC")}
                </time>
              </div>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink">
                {note.message}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isDraggable && (
              <>
                <button
                  type="button"
                  disabled={pinnedIndex === 0}
                  aria-label={`Move ${note.authorName}'s note up`}
                  onClick={() => movePinnedItem(pinnedIndex, pinnedIndex - 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-surface text-ink hover:bg-surface-muted disabled:opacity-40"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={pinnedIndex === pinnedNotes.length - 1}
                  aria-label={`Move ${note.authorName}'s note down`}
                  onClick={() => movePinnedItem(pinnedIndex, pinnedIndex + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-surface text-ink hover:bg-surface-muted disabled:opacity-40"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleToggle(note.id, { isPinned: !note.isPinned })
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 font-mono text-xs font-bold disabled:opacity-50 ${
                note.isPinned
                  ? "bg-ink text-white"
                  : "bg-surface text-ink hover:bg-surface-muted"
              }`}
            >
              <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{note.isPinned ? "Pinned" : "Pin"}</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleToggle(note.id, {
                  lovedByMaker: !note.lovedByMaker,
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 font-mono text-xs font-bold disabled:opacity-50 ${
                note.lovedByMaker
                  ? "bg-rose-50 text-rose-700"
                  : "bg-surface text-ink hover:bg-rose-50"
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  note.lovedByMaker
                    ? "fill-rose-500 text-rose-600"
                    : "text-ink-muted"
                }`}
                aria-hidden="true"
              />
              <span>{note.lovedByMaker ? "Loved" : "Love"}</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => setPendingDeleteNote(note)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-2.5 py-1 font-mono text-xs font-bold text-danger hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <section
      aria-labelledby="admin-notes-heading"
      className="neo-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="admin-notes-heading"
            className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
          >
            Community Notes &amp; Site Love ({notes.length})
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Pin top notes, drag to reorder pinned cards, give Maker Love, or
            remove unwanted notes.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-gemini-tint px-3.5 py-2 shadow-[2px_2px_0px_#111111]">
          <Heart
            className="h-4 w-4 fill-gemini-sky text-gemini-blue"
            aria-hidden="true"
          />
          <span className="font-mono text-xs font-bold text-ink">
            Total Site Love:
          </span>
          <span className="font-mono text-sm font-extrabold tabular-nums text-gemini-blue">
            {stats?.loveCount ?? 0}
          </span>
        </div>
      </div>

      {pinnedNotes.length > 0 && (
        <div className="mt-5 rounded-xl border-2 border-ink bg-canvas p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-gemini-blue">
                Pinned Notes Order ({pinnedNotes.length})
              </h3>
              <p className="text-xs text-ink-muted">
                Drag cards or use arrows to choose which notes appear first on
                the home wall.
              </p>
            </div>

            {isOrderDirty && (
              <button
                type="button"
                disabled={isSavingOrder}
                onClick={() => void handleSaveOrder()}
                className="neo-interactive inline-flex items-center gap-1.5 bg-gemini-blue px-3.5 py-1.5 font-mono text-xs font-bold text-white hover:bg-gemini-blue-hover disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isSavingOrder ? "Saving..." : "Save Order"}</span>
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-2.5">
            {pinnedNotes.map((note, index) => renderNoteRow(note, index))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
          Recent Notes ({unpinnedNotes.length})
        </h3>
        {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-ink/25 bg-surface-muted/40 p-6 text-center text-sm text-ink-muted">
            No community notes posted yet.
          </div>
        ) : unpinnedNotes.length === 0 ? (
          <p className="text-xs text-ink-muted">
            All stored notes are currently pinned above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {unpinnedNotes.map((note) => renderNoteRow(note))}
          </ul>
        )}
      </div>

      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-note-dialog-title"
        onClose={handleDialogClose}
        className="m-auto w-[min(92vw,28rem)] rounded-xl border-2 border-ink bg-surface p-6 text-ink shadow-[4px_4px_0px_#111111]"
      >
        <h1
          id="delete-note-dialog-title"
          className="text-lg font-extrabold tracking-tight text-ink"
        >
          Delete this community note?
        </h1>
        {pendingDeleteNote && (
          <div className="mt-3 rounded-lg border-2 border-ink bg-canvas p-3 text-xs">
            <p className="font-mono font-bold text-ink">
              {pendingDeleteNote.authorName} ·{" "}
              {formatTimestamp(pendingDeleteNote.createdAt, "en", "UTC")}
            </p>
            <p className="mt-1.5 line-clamp-3 text-ink-muted">
              {pendingDeleteNote.message}
            </p>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-muted">
          This permanently removes the note from Firestore and refreshes the
          public notes wall.
        </p>
        <form
          method="dialog"
          className="mt-5 flex flex-wrap items-center justify-end gap-3"
        >
          <button
            type="submit"
            value="cancel"
            autoFocus
            className="neo-interactive bg-surface px-4 py-2 font-mono text-xs font-bold text-ink hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            value="delete"
            className="neo-interactive bg-danger px-4 py-2 font-mono text-xs font-bold text-white hover:opacity-90"
          >
            Delete Note
          </button>
        </form>
      </dialog>
    </section>
  );
}
