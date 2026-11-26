import { NextResponse } from "next/server";
import { getCachedPublicTrackerData } from "@/lib/server/public-data";

export async function GET() {
  const payload = await getCachedPublicTrackerData();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
