import { afterEach, describe, expect, it } from "vitest";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  buildHomeJsonLd,
  buildLlmsTxt,
  serializeJsonLd,
} from "@/lib/seo";
import { DEFAULT_SITE_URL } from "@/lib/site-url";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe("robots.ts", () => {
  it("allows public pages, disallows /admin and /api/, and links to sitemap.xml", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const result = robots();

    expect(result.sitemap).toBe(`${DEFAULT_SITE_URL}/sitemap.xml`);
    expect(result.rules).toEqual([
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ]);
  });

  it("uses NEXT_PUBLIC_SITE_URL origin for sitemap URL when configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.example.com/path";

    const result = robots();

    expect(result.sitemap).toBe("https://custom.example.com/sitemap.xml");
  });
});

describe("sitemap.ts", () => {
  it("lists /, /notes, and /changelog with canonical origin and excludes /admin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      `${DEFAULT_SITE_URL}/`,
      `${DEFAULT_SITE_URL}/notes`,
      `${DEFAULT_SITE_URL}/changelog`,
    ]);
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(
      true,
    );
  });
});

describe("buildHomeJsonLd & serializeJsonLd", () => {
  it("builds WebSite, WebApplication, and FAQPage graph for the canonical origin", () => {
    const graph = buildHomeJsonLd("https://geminireset.fajrifarid.com");

    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@graph"]).toHaveLength(3);
    expect(graph["@graph"][0]).toMatchObject({
      "@type": "WebSite",
      url: "https://geminireset.fajrifarid.com/",
      inLanguage: ["en", "id"],
    });
    expect(graph["@graph"][1]).toMatchObject({
      "@type": "WebApplication",
      url: "https://geminireset.fajrifarid.com/",
      isAccessibleForFree: true,
    });
    expect(graph["@graph"][2]).toMatchObject({
      "@type": "FAQPage",
    });
  });

  it("escapes opening angle brackets to prevent script tag breakout", () => {
    const serialized = serializeJsonLd({ text: "</script><script>alert(1)" });

    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
  });
});

describe("llms.txt", () => {
  it("generates concise AI-readable overview with canonical links", () => {
    const text = buildLlmsTxt("https://geminireset.fajrifarid.com");

    expect(text).toContain("# Gemini Resets");
    expect(text).toContain("Ringkasan (ID):");
    expect(text).toContain("https://geminireset.fajrifarid.com/");
    expect(text).toContain("https://geminireset.fajrifarid.com/api/resets");
    expect(text).not.toContain("/admin");
  });

  it("serves plain text with cache headers from /llms.txt route", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const response = getLlmsTxt();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain(DEFAULT_SITE_URL);
  });
});
