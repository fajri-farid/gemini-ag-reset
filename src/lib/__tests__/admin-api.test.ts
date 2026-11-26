import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdminApiError,
  dateInputValueToUtcIso,
  datetimeLocalValueToIso,
  fetchAdminDashboard,
  isoToDateInputValue,
  isoToDatetimeLocalValue,
  triggerAdminSync,
} from "../admin-api";

describe("admin-api datetime helpers", () => {
  it("converts ISO timestamps to and from datetime-local values", () => {
    const sampleIso = "2026-11-26T08:30:00.000Z";
    const localValue = isoToDatetimeLocalValue(sampleIso);
    expect(localValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    const roundTrip = datetimeLocalValueToIso(localValue);
    expect(roundTrip).not.toBeNull();
    expect(new Date(roundTrip!).getTime()).toBe(new Date(sampleIso).getTime());

    expect(isoToDatetimeLocalValue("not-a-date")).toBe("");
    expect(datetimeLocalValueToIso("   ")).toBeNull();
    expect(datetimeLocalValueToIso("not-a-date")).toBeNull();
  });

  it("converts UTC date input strings safely without calendar rollover", () => {
    expect(isoToDateInputValue("2026-11-01T00:00:00.000Z")).toBe(
      "2026-11-01",
    );
    expect(isoToDateInputValue("invalid")).toBe("");

    expect(dateInputValueToUtcIso("2026-11-01")).toBe(
      "2026-11-01T00:00:00.000Z",
    );
    expect(dateInputValueToUtcIso("2026-02-30")).toBeNull();
    expect(dateInputValueToUtcIso("2026/11/01")).toBeNull();
  });
});

describe("admin-api HTTP helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends Bearer token on fetchAdminDashboard and returns parsed data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          resets: [],
          syncStatus: {
            lastCheckedAt: null,
            lastSeenTweetId: null,
            lastStatus: "ok",
            lastErrorMessage: null,
            trackingStartedAt: "2026-11-01T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchAdminDashboard("token-123");
    expect(payload.resets).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/resets");
    expect(init.cache).toBe("no-store");
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer token-123",
    );
  });

  it("throws AdminApiError with HTTP status when unauthorized or forbidden", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(triggerAdminSync("bad-token", true)).rejects.toMatchObject({
      name: "AdminApiError",
      status: 403,
      message: "Forbidden.",
    } satisfies Partial<AdminApiError>);
  });
});
