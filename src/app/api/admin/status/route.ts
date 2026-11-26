import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { revalidatePublicTrackerStatus } from "@/lib/server/public-data";
import { getResetRepository } from "@/lib/server/reset-repository";

const UpdateStatusSchema = z.object({
  trackingStartedAt: z
    .string()
    .trim()
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Invalid trackingStartedAt timestamp.",
    ),
});

export async function PATCH(request: Request) {
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

  const parsed = UpdateStatusSchema.safeParse(body);
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
  const syncStatus = await repo.updateSyncStatus({
    trackingStartedAt: new Date(parsed.data.trackingStartedAt).toISOString(),
  });

  revalidatePublicTrackerStatus();
  return NextResponse.json({ syncStatus });
}
