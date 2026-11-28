import { after, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cron-auth";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { revalidatePublicTrackerStatus } from "@/lib/server/public-data";
import { drainPushJobsSafely } from "@/lib/server/push-outbox";
import { isWebPushConfigured } from "@/lib/server/push-service";
import { pruneRateLimitBuckets } from "@/lib/server/rate-limit";
import { runSync } from "@/lib/server/sync-service";

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin is not configured." }, { status: 503 });
  }

  after(async () => {
    try {
      await pruneRateLimitBuckets();
    } catch {
      console.error("Rate limit bucket cleanup failed.");
    }
  });

  after(drainPushJobsSafely);
  const result = await runSync({
    trigger: "cron",
    dryRun: false,
    notifyNewResets: isWebPushConfigured(),
    onRevalidate: revalidatePublicTrackerStatus,
  });

  const ok = result.log.status === "ok";
  return NextResponse.json(
    {
      ok,
      savedCount: result.savedResets.length,
      log: result.log,
    },
    { status: ok ? 200 : 502 },
  );
}
