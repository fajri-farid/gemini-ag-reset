import { describe, expect, it } from "vitest";
import {
  buildShareCardFilename,
  SHARE_CARD_DIMENSIONS,
  VARUN_AVATAR_PUBLIC_PATH,
} from "../share-params";

describe("share-params constants and filenames", () => {
  it("defines exact PNG dimensions for 4:5, 9:16, and OG cards", () => {
    expect(SHARE_CARD_DIMENSIONS["4x5"]).toEqual({ width: 1080, height: 1350 });
    expect(SHARE_CARD_DIMENSIONS["9x16"]).toEqual({ width: 1080, height: 1920 });
    expect(SHARE_CARD_DIMENSIONS.og).toEqual({ width: 1200, height: 630 });
    expect(VARUN_AVATAR_PUBLIC_PATH).toBe("/V0Y7u33_.jpg");
  });

  it("builds predictable PNG filenames for hero and archive reset cards", () => {
    expect(buildShareCardFilename({ ratio: "4x5" })).toBe(
      "gemini-resets-4x5.png",
    );
    expect(
      buildShareCardFilename({
        ratio: "9x16",
        tweetId: "1860000000000000302",
      }),
    ).toBe("gemini-resets-9x16-1860000000000000302.png");
    expect(
      buildShareCardFilename({
        ratio: "4x5",
        tweetId: "not-numeric",
      }),
    ).toBe("gemini-resets-4x5.png");
  });
});
