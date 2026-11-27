import { NextResponse, type NextRequest } from "next/server";
import { NOTES_PAGE_SIZE, noteCursorParams } from "@/lib/sticky-notes";
import { communityError, isValidCommunityCursor, readCommunityMutation } from "@/lib/server/community-request";
import { noteMoodSchema, parseNoteCursor } from "@/lib/server/note-params";
import { submitPublicNote } from "@/lib/server/notes-service";
import { getCachedNotesPage, revalidatePublicNotes } from "@/lib/server/public-data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const moodParam = params.get("mood");
  const mood = noteMoodSchema.safeParse(moodParam);
  const loved = params.get("loved");
  const cursor = parseNoteCursor(params);
  if ((moodParam !== null && !mood.success) ||
      (loved !== null && loved !== "1") || cursor === undefined ||
      (cursor && !isValidCommunityCursor(noteCursorParams(cursor).toString(), params.get("cursorSignature")))) {
    return communityError(400, "validation_failed");
  }

  try {
    const page = await getCachedNotesPage({
      limit: NOTES_PAGE_SIZE,
      cursor,
      mood: mood.data ?? null,
      lovedOnly: loved === "1",
    });
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Public notes query failed.");
    return communityError(503, "community_unavailable");
  }
}

export async function POST(request: NextRequest) {
  const input = await readCommunityMutation(request, "notes", 4096);
  if ("response" in input) return input.response;
  try {
    const result = await submitPublicNote(input.body, input.visitor);
    if (!result.ok) return communityError(result.status, result.code);
    if (result.note && !result.replayed) revalidatePublicNotes();
    return NextResponse.json(
      { ok: true, note: result.note ?? null },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Community note submission failed.");
    return communityError(503, "community_unavailable");
  }
}
