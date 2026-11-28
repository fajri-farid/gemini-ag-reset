import { after, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { revalidatePublicTrackerStatus } from "@/lib/server/public-data";
import { drainPushJobsSafely } from "@/lib/server/push-outbox";
import { isWebPushConfigured } from "@/lib/server/push-service";
import { runSync } from "@/lib/server/sync-service";

const TriggerSyncSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown = {};
  const rawBody = await request.text();
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }
  }

  const parsed = TriggerSyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed." },
      { status: 400 },
    );
  }

  const dryRun = parsed.data.dryRun;
  if (!dryRun) after(drainPushJobsSafely);
  const result = await runSync({
    trigger: dryRun ? "admin_dry_run" : "admin_live",
    dryRun,
    notifyNewResets: !dryRun && isWebPushConfigured(),
    onRevalidate: revalidatePublicTrackerStatus,
  });

  return NextResponse.json({
    ok: result.log.status === "ok",
    dryRun,
    log: result.log,
    savedResets: result.savedResets,
  });
}
