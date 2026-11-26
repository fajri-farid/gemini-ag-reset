import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { revalidatePublicResets } from "@/lib/server/public-data";
import { getResetRepository } from "@/lib/server/reset-repository";

const UpdateResetSchema = z
  .object({
    tweetText: z.string().trim().min(1).max(4000).optional(),
    summary: z.string().trim().max(300).nullable().optional(),
    resetAt: z
      .string()
      .trim()
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        "Invalid resetAt timestamp.",
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.tweetText !== undefined ||
      data.summary !== undefined ||
      data.resetAt !== undefined,
    "At least one field must be provided.",
  );

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tweetId: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { tweetId } = await context.params;
  if (!/^\d{10,25}$/.test(tweetId)) {
    return NextResponse.json({ error: "Invalid tweetId." }, { status: 400 });
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

  const parsed = UpdateResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const repo = getResetRepository();
  const updated = await repo.updateReset(tweetId, {
    ...(parsed.data.tweetText !== undefined
      ? { tweetText: parsed.data.tweetText }
      : {}),
    ...(parsed.data.summary !== undefined
      ? { summary: parsed.data.summary?.trim() || null }
      : {}),
    ...(parsed.data.resetAt !== undefined
      ? { resetAt: new Date(parsed.data.resetAt).toISOString() }
      : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Reset not found." }, { status: 404 });
  }

  revalidatePublicResets();
  return NextResponse.json({ reset: updated });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ tweetId: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { tweetId } = await context.params;
  if (!/^\d{10,25}$/.test(tweetId)) {
    return NextResponse.json({ error: "Invalid tweetId." }, { status: 400 });
  }

  const repo = getResetRepository();
  const deleted = await repo.deleteReset(tweetId);
  if (!deleted) {
    return NextResponse.json({ error: "Reset not found." }, { status: 404 });
  }

  revalidatePublicResets();
  return NextResponse.json({ ok: true, tweetId });
}
