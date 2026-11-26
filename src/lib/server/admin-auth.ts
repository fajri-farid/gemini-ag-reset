import "server-only";
import { getAdminAuth, isFirebaseAdminConfigured } from "./firebase-admin";

export interface DecodedAdminToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

export interface AdminTokenVerifier {
  verifyIdToken(token: string): Promise<DecodedAdminToken>;
}

export type AdminAuthResult =
  | { ok: true; uid: string; email: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

export interface VerifyAdminOptions {
  adminEmail?: string;
  verifier?: AdminTokenVerifier;
  isConfigured?: boolean;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export async function verifyAdminBearerToken(
  authHeader: string | null,
  options?: VerifyAdminOptions,
): Promise<AdminAuthResult> {
  const adminEmail = (options?.adminEmail ?? process.env.ADMIN_EMAIL ?? "").trim();
  if (!adminEmail) {
    return {
      ok: false,
      status: 503,
      error: "Admin access is not configured.",
    };
  }

  const configured = options?.isConfigured ?? isFirebaseAdminConfigured();
  if (!options?.verifier && !configured) {
    return {
      ok: false,
      status: 503,
      error: "Firebase Admin is not configured.",
    };
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Missing authorization token.",
    };
  }

  const verifier = options?.verifier ?? getAdminAuth();
  let decoded: DecodedAdminToken;
  try {
    decoded = await verifier.verifyIdToken(token);
  } catch {
    return {
      ok: false,
      status: 401,
      error: "Invalid or expired authorization token.",
    };
  }

  const verifiedEmail = decoded.email?.trim() ?? "";
  if (
    decoded.email_verified !== true ||
    !verifiedEmail ||
    verifiedEmail.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden.",
    };
  }

  return {
    ok: true,
    uid: decoded.uid,
    email: verifiedEmail,
  };
}

export async function verifyAdminRequest(
  request: Request,
): Promise<AdminAuthResult> {
  return verifyAdminBearerToken(request.headers.get("authorization"));
}
