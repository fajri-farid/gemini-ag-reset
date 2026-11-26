import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cron-auth";
import { runSync } from "@/lib/server/sync-service";

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runSync({
    trigger: "cron",
    dryRun: false,
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
