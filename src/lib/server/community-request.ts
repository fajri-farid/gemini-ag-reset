import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "./firebase-admin";

function visitorCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-gemini_community" : "gemini_community";
}
const localKey = randomUUID();

function signingKey() {
  if (process.env.NODE_ENV !== "production") return process.env.COMMUNITY_COOKIE_SECRET?.trim() || localKey;
  const key = process.env.COMMUNITY_COOKIE_SECRET?.trim();
  return key && key.length >= 32 && isFirebaseAdminConfigured() ? key : null;
}

function sign(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

export function signCommunityCursor(value: string) {
  const key = signingKey();
  return key ? sign("notes-cursor:" + value, key) : null;
}

export function isValidCommunityCursor(value: string, signature: string | null) {
  const expected = signCommunityCursor(value);
  return Boolean(expected && signature && /^[0-9a-f]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")));
}

export function communityError(status: number, code: string) {
  return NextResponse.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (site && site !== "same-origin") return false;
  if (!origin) return true;

  // Next can use an internal hostname for nextUrl when it runs behind its server.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-proto") : null;
  const protocol = forwarded === "https" || forwarded === "http"
    ? forwarded + ":"
    : request.nextUrl.protocol;
  try {
    return origin === new URL(protocol + "//" + host).origin;
  } catch {
    return false;
  }
}

function readVisitor(request: NextRequest, key: string) {
  const [id, signature, extra] = (request.cookies.get(visitorCookieName())?.value ?? "").split(".");
  if (extra !== undefined || !/^[0-9a-f-]{36}$/.test(id) ||
      !signature || !/^[0-9a-f]{64}$/.test(signature)) return null;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(id, key), "hex"))
    ? sign(`rate:${id}`, key)
    : null;
}

export function startCommunitySession(request: NextRequest) {
  if (!isSameOrigin(request)) return communityError(403, "invalid_origin");
  const key = signingKey();
  if (!key) return communityError(503, "community_unavailable");
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!readVisitor(request, key)) {
    const id = randomUUID();
    response.cookies.set(visitorCookieName(), `${id}.${sign(id, key)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export async function readCommunityMutation(
  request: NextRequest,
  feature: "love" | "notes",
  maxBytes: number,
): Promise<{ body: unknown; visitor: string } | { response: NextResponse }> {
  if (!isSameOrigin(request)) return { response: communityError(403, "invalid_origin") };
  const key = signingKey();
  if (!key || (feature === "love" ? process.env.COMMUNITY_LOVE_ENABLED : process.env.COMMUNITY_NOTES_ENABLED) === "false") {
    return { response: communityError(503, "community_unavailable") };
  }
  const visitor = readVisitor(request, key);
  if (!visitor) return { response: communityError(401, "visitor_session_required") };
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return { response: communityError(415, "validation_failed") };
  }
  const reader = request.body?.getReader();
  if (!reader) return { response: communityError(400, "validation_failed") };
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0;
    let source = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return { response: communityError(413, "validation_failed") };
      }
      source += decoder.decode(value, { stream: true });
    }
    return { body: JSON.parse(source + decoder.decode()), visitor };
  } catch {
    return { response: communityError(400, "validation_failed") };
  } finally {
    reader.releaseLock();
  }
}
