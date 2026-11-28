import { NextResponse, type NextRequest } from "next/server";
import { pushError, readPushRequest, unsubscribeSchema } from "@/lib/server/push-request";
import { getPushSubscriptionRepository } from "@/lib/server/push-service";
import { reservePushAttempt } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const input = await readPushRequest(request, unsubscribeSchema);
  if ("response" in input) return input.response;

  try {
    if (!await reservePushAttempt(request, "unsubscribe")) {
      return pushError(429, "Too many push subscription requests.");
    }
    const removed = await getPushSubscriptionRepository().removeByEndpoint(input.data.endpoint, input.data.auth);
    if (!removed) return pushError(403, "Could not remove this subscription.");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Could not remove push subscription.");
    return pushError(503, "Push subscription storage is unavailable.");
  }
}
