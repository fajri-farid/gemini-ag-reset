import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  isValidCommunityCursor,
  readCommunityMutation,
  signCommunityCursor,
  startCommunitySession,
} from "../community-request";

const site = "https://tracker.example";

function sessionCookie() {
  const response = startCommunitySession(new NextRequest(site + "/api/community/session", { method: "POST" }));
  expect(response.status).toBe(204);
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=strict");
  return cookie.split(";")[0];
}

function loveRequest(cookie: string, body: string, origin = site) {
  return new NextRequest(site + "/api/love", {
    method: "POST",
    headers: { cookie, origin, "content-type": "application/json" },
    body,
  });
}

describe("community visitor", () => {
  it("gives separate visitors separate buckets without any IP header", async () => {
    const first = await readCommunityMutation(loveRequest(sessionCookie(), "{}"), "love", 512);
    const second = await readCommunityMutation(loveRequest(sessionCookie(), "{}"), "love", 512);
    expect(first).toHaveProperty("visitor");
    expect(second).toHaveProperty("visitor");
    expect(first).not.toEqual(second);
  });

  it("rejects cross-origin writes, invalid signatures and oversized JSON", async () => {
    const cookie = sessionCookie();
    const crossOrigin = await readCommunityMutation(loveRequest(cookie, "{}", "https://unrelated.example"), "love", 512);
    const tampered = await readCommunityMutation(loveRequest(cookie + "0", "{}"), "love", 512);
    const oversized = await readCommunityMutation(loveRequest(cookie, JSON.stringify("x".repeat(513))), "love", 512);
    expect(crossOrigin).toMatchObject({ response: { status: 403 } });
    expect(tampered).toMatchObject({ response: { status: 401 } });
    expect(oversized).toMatchObject({ response: { status: 413 } });
  });

  it("uses the request host when Next supplies an internal URL", () => {
    const request = new NextRequest("http://localhost:3000/api/community/session", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    });
    expect(startCommunitySession(request).status).toBe(204);
  });

  it("refuses to issue a production session without the cookie signing secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COMMUNITY_COOKIE_SECRET", undefined);
    try {
      expect(startCommunitySession(new NextRequest(site + "/api/community/session", {
        method: "POST",
      })).status).toBe(503);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("binds public pagination signatures to the complete cursor", () => {
    const cursor = "cursorId=abc&cursorPinOrder=1";
    const signature = signCommunityCursor(cursor);
    expect(isValidCommunityCursor(cursor, signature)).toBe(true);
    expect(isValidCommunityCursor(cursor.replace("abc", "xyz"), signature)).toBe(false);
  });
});
