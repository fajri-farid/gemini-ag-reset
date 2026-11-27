import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { noteIdSchema } from "@/lib/server/note-params";
import { getNotesRepository, NoteConflictError } from "@/lib/server/notes-repository";
import { revalidatePublicNotes } from "@/lib/server/public-data";

const headers = { "Cache-Control": "private, no-store" };

const UpdateAdminNoteSchema = z
  .object({
    isPinned: z.boolean().optional(),
    lovedByMaker: z.boolean().optional(),
    status: z.enum(["published", "hidden"]).optional(),
  })
  .refine(
    (value) =>
      value.isPinned !== undefined ||
      value.lovedByMaker !== undefined ||
      value.status !== undefined,
    { message: "At least one field must be provided." },
  );

interface RouteContext {
  params: Promise<{ noteId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  }

  const { noteId } = await context.params;
  const trimmedId = noteId.trim();
  if (!noteIdSchema.safeParse(trimmedId).success) {
    return NextResponse.json({ error: "Invalid noteId." }, { status: 400, headers });
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

  const parsed = UpdateAdminNoteSchema.safeParse(body);
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
    const updated = await getNotesRepository().updateNoteAdmin(trimmedId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Note not found." }, { status: 404, headers });
    }
    revalidatePublicNotes();
    return NextResponse.json({ note: updated }, { headers });
  } catch (error) {
    if (error instanceof NoteConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409, headers });
    }
    console.error("Admin note update failed.");
    return NextResponse.json({ error: "Unable to update note." }, { status: 503, headers });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  }

  const { noteId } = await context.params;
  const trimmedId = noteId.trim();
  if (!noteIdSchema.safeParse(trimmedId).success) {
    return NextResponse.json({ error: "Invalid noteId." }, { status: 400, headers });
  }

  try {
    const deleted = await getNotesRepository().deleteNoteAdmin(trimmedId);
    if (!deleted) {
      return NextResponse.json({ error: "Note not found." }, { status: 404, headers });
    }
    revalidatePublicNotes();
    return NextResponse.json({ ok: true, noteId: trimmedId }, { headers });
  } catch {
    console.error("Admin note delete failed.");
    return NextResponse.json({ error: "Unable to delete note." }, { status: 503, headers });
  }
}
