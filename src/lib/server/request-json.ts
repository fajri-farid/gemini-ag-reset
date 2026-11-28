import "server-only";
import type { NextRequest } from "next/server";

export function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (site && site !== "same-origin") return false;
  if (!origin) return true;

  const host = request.headers.get("host") ?? request.nextUrl.host;
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-proto") : null;
  const protocol = forwarded === "https" || forwarded === "http"
    ? `${forwarded}:`
    : request.nextUrl.protocol;
  try {
    return origin === new URL(`${protocol}//${host}`).origin;
  } catch {
    return false;
  }
}

export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<{ body: unknown } | { status: 400 | 413 | 415 }> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return { status: 415 };

  const reader = request.body?.getReader();
  if (!reader) return { status: 400 };
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
        return { status: 413 };
      }
      source += decoder.decode(value, { stream: true });
    }
    return { body: JSON.parse(source + decoder.decode()) };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}
