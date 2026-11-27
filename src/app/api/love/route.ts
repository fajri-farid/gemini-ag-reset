import { NextResponse, type NextRequest } from "next/server";
import { communityError, readCommunityMutation } from "@/lib/server/community-request";
import { submitSiteLove } from "@/lib/server/notes-service";

export async function POST(request: NextRequest) {
  const input = await readCommunityMutation(request, "love", 512);
  if ("response" in input) return input.response;
  try {
    const result = await submitSiteLove(input.body, input.visitor);
    return NextResponse.json(result, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Community love write failed.");
    return communityError(503, "community_unavailable");
  }
}
