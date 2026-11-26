import { describe, expect, it } from "vitest";
import { getDeveloperLinks, siteConfig } from "../site";

describe("siteConfig", () => {
  it("defines Gemini Resets identity and target account metadata", () => {
    expect(siteConfig.name).toBe("Gemini Resets");
    expect(siteConfig.targetAccount.username).toBe("_mohansolo");
    expect(siteConfig.targetAccount.timezone).toBe("America/Los_Angeles");
    expect(siteConfig.defaultLocale).toBe("en");
  });

  it("returns valid HTTPS developer links matching configured profile URLs", () => {
    const links = getDeveloperLinks();
    const ids = links.map((link) => link.id);

    expect(ids).toEqual(["website", "github", "linkedin", "instagram"]);

    for (const link of links) {
      const parsed = new URL(link.href);
      expect(parsed.protocol).toBe("https:");
    }
  });
});
