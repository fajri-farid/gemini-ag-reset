import { z } from "zod";
import { getMorePublicFeedItems } from "@/lib/server/public-data";

const cursorSchema = z.object({
  resetAt: z.iso.datetime(),
  tweetId: z.string().regex(/^\d{1,25}$/),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = cursorSchema.safeParse({
    resetAt: searchParams.get("resetAt"),
    tweetId: searchParams.get("tweetId"),
  });
  if (!cursor.success) {
    return Response.json({ error: "Invalid feed cursor." }, { status: 400 });
  }

  return Response.json(await getMorePublicFeedItems(cursor.data));
}
