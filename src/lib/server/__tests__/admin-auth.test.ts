import { describe, expect, it } from "vitest";
import { verifyAdminBearerToken, type AdminTokenVerifier } from "../admin-auth";

const DUMMY_ADMIN_EMAIL = "owner@example.com";

function createMockVerifier(
  result: { uid: string; email?: string; email_verified?: boolean } | Error,
): AdminTokenVerifier {
  return {
    async verifyIdToken() {
      if (result instanceof Error) {
        throw result;
      }
      return result;
    },
  };
}

describe("verifyAdminBearerToken (fail-closed)", () => {
  it("returns 503 when ADMIN_EMAIL is not configured", async () => {
    const res = await verifyAdminBearerToken("Bearer valid-token", {
      adminEmail: "",
      verifier: createMockVerifier({
        uid: "u1",
        email: DUMMY_ADMIN_EMAIL,
        email_verified: true,
      }),
    });

    expect(res).toEqual({
      ok: false,
      status: 503,
      error: "Admin access is not configured.",
    });
  });

  it("returns 503 when Firebase Admin is not configured and no custom verifier is provided", async () => {
    const res = await verifyAdminBearerToken("Bearer valid-token", {
      adminEmail: DUMMY_ADMIN_EMAIL,
      isConfigured: false,
    });

    expect(res).toEqual({
      ok: false,
      status: 503,
      error: "Firebase Admin is not configured.",
    });
  });

  it("returns 401 when Authorization header is missing or malformed", async () => {
    const verifier = createMockVerifier({
      uid: "u1",
      email: DUMMY_ADMIN_EMAIL,
      email_verified: true,
    });

    expect(
      await verifyAdminBearerToken(null, {
        adminEmail: DUMMY_ADMIN_EMAIL,
        verifier,
      }),
    ).toEqual({
      ok: false,
      status: 401,
      error: "Missing authorization token.",
    });

    expect(
      await verifyAdminBearerToken("Basic abc123", {
        adminEmail: DUMMY_ADMIN_EMAIL,
        verifier,
      }),
    ).toEqual({
      ok: false,
      status: 401,
      error: "Missing authorization token.",
    });
  });

  it("returns 401 when token verification throws", async () => {
    const res = await verifyAdminBearerToken("Bearer expired-token", {
      adminEmail: DUMMY_ADMIN_EMAIL,
      verifier: createMockVerifier(new Error("token expired")),
    });

    expect(res).toEqual({
      ok: false,
      status: 401,
      error: "Invalid or expired authorization token.",
    });
  });

  it("returns 403 when email is unverified or does not match ADMIN_EMAIL", async () => {
    const unverifiedRes = await verifyAdminBearerToken("Bearer valid-token", {
      adminEmail: DUMMY_ADMIN_EMAIL,
      verifier: createMockVerifier({
        uid: "u1",
        email: DUMMY_ADMIN_EMAIL,
        email_verified: false,
      }),
    });
    expect(unverifiedRes).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden.",
    });

    const wrongEmailRes = await verifyAdminBearerToken("Bearer valid-token", {
      adminEmail: DUMMY_ADMIN_EMAIL,
      verifier: createMockVerifier({
        uid: "u2",
        email: "attacker@example.com",
        email_verified: true,
      }),
    });
    expect(wrongEmailRes).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden.",
    });
  });

  it("returns ok: true when token is valid, verified, and email matches case-insensitively", async () => {
    const res = await verifyAdminBearerToken("Bearer valid-token", {
      adminEmail: DUMMY_ADMIN_EMAIL,
      verifier: createMockVerifier({
        uid: "admin-uid-1",
        email: "OWNER@example.com",
        email_verified: true,
      }),
    });

    expect(res).toEqual({
      ok: true,
      uid: "admin-uid-1",
      email: "OWNER@example.com",
    });
  });
});
