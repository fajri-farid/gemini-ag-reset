import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { revalidatePublicResets } from "@/lib/server/public-data";
import { getResetRepository } from "@/lib/server/reset-repository";
import {
  buildCanonicalTweetUrl,
  extractTweetIdFromUrl,
} from "@/lib/tweet-url";

const CreateManualResetSchema = z.object({
  tweetUrlOrId: z.string().trim().min(1, "Tweet URL or ID is required."),
  tweetText: z
    .string()
    .trim()
    .min(1, "Tweet text is required.")
    .max(4000, "Tweet text is too long."),
  summary: z.string().trim().max(300).nullable().optional(),
  resetAt: z
    .string()
    .trim()
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Invalid resetAt timestamp.",
    ),
});

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const repo = getResetRepository();
  const [resets, syncStatus] = await Promise.all([
    repo.listResets(),
    repo.getSyncStatus(),
  ]);

  return NextResponse.json({ resets, syncStatus }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const parsed = CreateManualResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const tweetId = extractTweetIdFromUrl(parsed.data.tweetUrlOrId);
  if (!tweetId) {
    return NextResponse.json(
      { error: "Invalid X/Twitter status URL or numeric tweet ID." },
      { status: 400 },
    );
  }

  const repo = getResetRepository();
  const reset = await repo.upsertReset({
    tweetId,
    tweetUrl: buildCanonicalTweetUrl(tweetId),
    tweetText: parsed.data.tweetText,
    summary: parsed.data.summary?.trim() || null,
    confidence: 1,
    source: "manual",
    resetAt: new Date(parsed.data.resetAt).toISOString(),
  });

  revalidatePublicResets();

  return NextResponse.json({ reset }, { status: 201 });
}
