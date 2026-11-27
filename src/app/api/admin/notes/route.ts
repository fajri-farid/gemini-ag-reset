import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { parseNoteCursor } from "@/lib/server/note-params";
import { getNotesRepository } from "@/lib/server/notes-repository";
import { MAX_PINNED_NOTES } from "@/lib/sticky-notes";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  }

  const cursor = parseNoteCursor(request.nextUrl.searchParams);
  if (cursor === undefined) {
    return NextResponse.json({ error: "Invalid notes cursor." }, { status: 400, headers });
  }
  const repo = getNotesRepository();
  try {
    const [page, stats] = await Promise.all([
      repo.listNotesAdmin({ limit: MAX_PINNED_NOTES, cursor }),
      cursor ? null : repo.getSiteStats(),
    ]);
    return NextResponse.json({ notes: page.items, nextCursor: page.nextCursor, stats }, { headers });
  } catch {
    console.error("Admin notes query failed.");
    return NextResponse.json({ error: "Unable to load notes." }, { status: 503, headers });
  }
}
