import "server-only";
import { createECDH, ECDH } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidPushEndpoint } from "@/lib/push";
import { isSameOrigin, readBoundedJson } from "./request-json";

function decodeBase64Url(value: string, bytes: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length === bytes && decoded.toString("base64url") === value ? decoded : null;
}

function validP256Key(value: string): boolean {
  const key = decodeBase64Url(value, 65);
  if (!key || key[0] !== 4) return false;
  try {
    ECDH.convertKey(key, "prime256v1");
    return true;
  } catch {
    return false;
  }
}

export function validVapidKeys(publicKey: string, privateKey: string): boolean {
  const key = decodeBase64Url(privateKey, 32);
  if (!key || !validP256Key(publicKey)) return false;
  try {
    const signingKey = createECDH("prime256v1");
    signingKey.setPrivateKey(key);
    return signingKey.getPublicKey().toString("base64url") === publicKey;
  } catch {
    return false;
  }
}

const endpointSchema = z.string().trim().max(2048).refine(isValidPushEndpoint);
const authSchema = z.string().length(22).refine((value) => Boolean(decodeBase64Url(value, 16)));
export const pushLocaleSchema = z.enum(["en", "id"]).default("en");

export const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().length(87).refine(validP256Key),
    auth: authSchema,
  }),
});
export const subscribeSchema = pushSubscriptionSchema.extend({ locale: pushLocaleSchema });
export const subscribeRequestSchema = subscribeSchema.extend({ existingOnly: z.boolean().default(false) });
export const unsubscribeSchema = z.object({ endpoint: endpointSchema, auth: authSchema });

export function pushError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readPushRequest<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
  if (!isSameOrigin(request)) return { response: pushError(403, "Invalid request origin.") };
  const json = await readBoundedJson(request, 4096);
  if ("status" in json) return { response: pushError(json.status, "Expected a bounded JSON request.") };
  const parsed = schema.safeParse(json.body);
  if (!parsed.success) return { response: pushError(400, "Invalid push subscription.") };
  return { data: parsed.data };
}
