import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SITE_URL,
  getSiteDisplayHost,
  getSiteOrigin,
  resolveSiteUrl,
} from "../site-url";

describe("site-url helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads valid NEXT_PUBLIC_SITE_URL and exposes origin and host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://resets.example.com/tracker/");

    expect(resolveSiteUrl().origin).toBe("https://resets.example.com");
    expect(getSiteOrigin()).toBe("https://resets.example.com");
    expect(getSiteDisplayHost()).toBe("resets.example.com");
  });

  it("preserves port for localhost development URLs", () => {
    expect(getSiteOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(getSiteDisplayHost("http://localhost:3000")).toBe("localhost:3000");
  });

  it("falls back safely when env is missing, invalid, or uses non-http protocols", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteOrigin()).toBe(DEFAULT_SITE_URL);

    expect(getSiteOrigin("not-a-valid-url")).toBe(DEFAULT_SITE_URL);
    expect(getSiteOrigin("javascript:alert(1)")).toBe(DEFAULT_SITE_URL);
    expect(getSiteDisplayHost("ftp://files.example.com")).toBe(
      "geminireset.fajrifarid.com",
    );
  });
});
