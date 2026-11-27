import { after, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cron-auth";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { revalidatePublicTrackerStatus } from "@/lib/server/public-data";
import { pruneCommunityBuckets } from "@/lib/server/rate-limit";
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
      await pruneCommunityBuckets();
    } catch {
      console.error("Community bucket cleanup failed.");
    }
  });

  const result = await runSync({
    trigger: "cron",
    dryRun: false,
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
