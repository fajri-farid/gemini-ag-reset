import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { MAX_PINNED_NOTES } from "@/lib/sticky-notes";
import { noteIdSchema } from "@/lib/server/note-params";
import { getNotesRepository, NoteConflictError } from "@/lib/server/notes-repository";
import { revalidatePublicNotes } from "@/lib/server/public-data";

const headers = { "Cache-Control": "private, no-store" };

const pinnedIdsSchema = z.array(noteIdSchema)
  .min(1, "At least one note ID is required.")
  .max(MAX_PINNED_NOTES)
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate note IDs.");

const ReorderPinnedNotesSchema = z.object({
  orderedIds: pinnedIdsSchema,
  expectedOrder: pinnedIdsSchema,
});

export async function PATCH(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers },
    );
  }

  const parsed = ReorderPinnedNotesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400, headers },
    );
  }

  try {
    const notes = await getNotesRepository().reorderPinnedNotes(
      parsed.data.orderedIds, parsed.data.expectedOrder,
    );
    revalidatePublicNotes();
    return NextResponse.json({ ok: true, notes }, { headers });
  } catch (error) {
    if (error instanceof NoteConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409, headers });
    }
    console.error("Admin reorder failed.");
    return NextResponse.json({ error: "Unable to reorder notes." }, { status: 503, headers });
  }
}
