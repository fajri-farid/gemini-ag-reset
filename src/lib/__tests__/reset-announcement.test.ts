import { describe, expect, it } from "vitest";
import { isFreshReset } from "../reset-announcement";

describe("isFreshReset", () => {
  const now = Date.parse("2026-11-27T10:00:00Z");

  it("accepts only valid, non-future resets strictly younger than five hours", () => {
    expect(isFreshReset("2026-11-27T10:00:00Z", now)).toBe(true);
    expect(isFreshReset("2026-11-27T05:00:00.001Z", now)).toBe(true);
    expect(isFreshReset("2026-11-27T05:00:00Z", now)).toBe(false);
    expect(isFreshReset("2026-11-27T04:59:59Z", now)).toBe(false);
    expect(isFreshReset("2026-11-27T10:00:01Z", now)).toBe(false);
    expect(isFreshReset("invalid", now)).toBe(false);
  });
});
