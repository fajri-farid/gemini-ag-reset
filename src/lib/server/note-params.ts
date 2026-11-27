import "server-only";
﻿import { z } from "zod";
import { STICKY_NOTE_MOODS } from "@/lib/sticky-notes";

export const noteIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);

export const noteCursorSchema = z.object({
  id: noteIdSchema,
  createdAt: z.iso.datetime({ precision: 3 }),
  isPinned: z.boolean(),
  pinOrder: z.number().int().min(1).max(999_999),
});

export function parseNoteCursor(params: URLSearchParams) {
  if (!["cursorId", "cursorCreatedAt", "cursorIsPinned", "cursorPinOrder"].some((key) => params.has(key))) {
    return null;
  }
  const pinned = params.get("cursorIsPinned");
  const cursor = noteCursorSchema.safeParse({
    id: params.get("cursorId"),
    createdAt: params.get("cursorCreatedAt"),
    isPinned: pinned === "1" ? true : pinned === "0" ? false : undefined,
    pinOrder: Number(params.get("cursorPinOrder")),
  });
  return cursor.success ? cursor.data : undefined;
}

export const noteMoodSchema = z.enum(STICKY_NOTE_MOODS);
