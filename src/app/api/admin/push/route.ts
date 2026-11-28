import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/server/admin-auth";
import { pushError, pushLocaleSchema, pushSubscriptionSchema, readPushRequest } from "@/lib/server/push-request";
import {
  getPushSubscriptionRepository,
  isWebPushConfigured,
  sendTestPushToSubscription,
} from "@/lib/server/push-service";
import { getResetRepository } from "@/lib/server/reset-repository";

const TestPushSchema = z.object({
  subscription: pushSubscriptionSchema,
  locale: pushLocaleSchema,
});

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const configured = isWebPushConfigured();
  try {
    const subscriberCount = await getPushSubscriptionRepository().count();
    return NextResponse.json(
      { configured, subscriberCount },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    console.error("Could not count Web Push subscriptions.");
    return pushError(503, "Could not load Web Push status.");
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push VAPID keys are not configured." },
      { status: 503 },
    );
  }

  const parsed = await readPushRequest(request, TestPushSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const resets = await getResetRepository().listResets();
    const latestReset = resets[0] ?? null;

    await sendTestPushToSubscription(
      {
        ...parsed.data.subscription,
        locale: parsed.data.locale,
      },
      { latestReset },
    );
    return NextResponse.json({ ok: true });
  } catch {
    console.error("Could not send the Web Push demo.");
    return pushError(502, "Could not send the demo notification.");
  }
}
