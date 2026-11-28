import { NextResponse, type NextRequest } from "next/server";
import { pushError, readPushRequest, subscribeRequestSchema } from "@/lib/server/push-request";
import { getPushSubscriptionRepository, isWebPushConfigured } from "@/lib/server/push-service";
import { reservePushAttempt } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  if (!isWebPushConfigured()) return pushError(503, "Push notifications are unavailable.");
  const input = await readPushRequest(request, subscribeRequestSchema);
  if ("response" in input) return input.response;

  try {
    if (!await reservePushAttempt(request, "subscribe")) {
      return pushError(429, "Too many push subscription requests.");
    }
    const { existingOnly, ...subscription } = input.data;
    const active = await getPushSubscriptionRepository().upsert(subscription, existingOnly);
    if (!active && !existingOnly) return pushError(403, "Could not update this subscription.");
    return NextResponse.json({ active }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Could not store push subscription.");
    return pushError(503, "Push subscription storage is unavailable.");
  }
}
