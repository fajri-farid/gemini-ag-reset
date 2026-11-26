import { describe, expect, it } from "vitest";
import { verifyCronSecret } from "../cron-auth";
import { sanitizeErrorMessage } from "../error-sanitizer";

describe("verifyCronSecret (fail-closed)", () => {
  it("returns 503 when CRON_SECRET is not configured", () => {
    expect(verifyCronSecret("Bearer anything", "")).toEqual({
      ok: false,
      status: 503,
      error: "Cron secret is not configured.",
    });
  });

  it("returns 401 when header is missing, malformed, or does not match", () => {
    expect(verifyCronSecret(null, "super-secret-value")).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized.",
    });

    expect(verifyCronSecret("Basic abc", "super-secret-value")).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized.",
    });

    expect(verifyCronSecret("Bearer wrong-secret", "super-secret-value")).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized.",
    });

    expect(
      verifyCronSecret("Bearer super-secret-valu", "super-secret-value"),
    ).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized.",
    });
  });

  it("returns ok: true when Bearer secret matches", () => {
    expect(
      verifyCronSecret("Bearer super-secret-value", "super-secret-value"),
    ).toEqual({
      ok: true,
    });
  });
});

describe("sanitizeErrorMessage", () => {
  it("masks Bearer tokens and dynamic API key prefixes", () => {
    const fakeGoogleKey = ["AI", "za", "TestKey1234567890123456"].join("");
    const fakeSkKey = ["sk", "-", "testSecretValue1234567890"].join("");
    const msg = sanitizeErrorMessage(
      new Error(
        `Request failed with Bearer secret-tok and ${fakeGoogleKey} and ${fakeSkKey}`,
      ),
    );

    expect(msg).not.toContain("secret-tok");
    expect(msg).not.toContain(fakeGoogleKey);
    expect(msg).not.toContain(fakeSkKey);
    expect(msg).toContain("Bearer [REDACTED]");
    expect(msg).toContain("[REDACTED_KEY]");
  });
});
