import { getCachedPublicTrackerData } from "@/lib/server/public-data";

export async function GET() {
  const payload = await getCachedPublicTrackerData();

  return Response.json(payload);
}
