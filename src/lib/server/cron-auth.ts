import "server-only";
import crypto from "node:crypto";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export function verifyCronSecret(
  authHeader: string | null,
  expectedSecret?: string,
): CronAuthResult {
  const secret = (expectedSecret ?? process.env.CRON_SECRET ?? "").trim();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "Cron secret is not configured.",
    };
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized.",
    };
  }

  const expectedBuf = Buffer.from(secret, "utf8");
  const actualBuf = Buffer.from(token, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized.",
    };
  }

  return { ok: true };
}

export function verifyCronRequest(request: Request): CronAuthResult {
  return verifyCronSecret(request.headers.get("authorization"));
}
