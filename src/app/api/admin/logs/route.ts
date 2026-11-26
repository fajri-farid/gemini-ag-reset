import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { getResetRepository } from "@/lib/server/reset-repository";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : undefined;

  const repo = getResetRepository();
  const logs = await repo.listSyncLogs(parsedLimit);

  return NextResponse.json({ logs }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
