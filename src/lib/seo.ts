import { siteConfig } from "@/config/site";
import { getSiteOrigin } from "@/lib/site-url";

export const SEO_DESCRIPTION =
  "Live Gemini quota reset tracker for Antigravity. Tracks @_mohansolo (Varun Mohan) hourly with instant reset status, daily heatmap, and verified X announcement archive.";

export const SEO_KEYWORDS: readonly string[] = [
  "Gemini Resets",
  "Gemini reset tracker",
  "Antigravity quota reset",
  "Gemini quota reset",
  "Antigravity reset tracker",
  "tracker gemini reset",
  "cek reset kuota gemini",
  "reset kuota antigravity",
  "jadwal reset kuota gemini",
  "Varun Mohan",
  "_mohansolo",
];

export interface HomeJsonLdGraph {
  "@context": "https://schema.org";
  "@graph": readonly Record<string, unknown>[];
}

export function buildHomeJsonLd(rawSiteUrl?: string): HomeJsonLdGraph {
  const origin = getSiteOrigin(rawSiteUrl);
  const homeUrl = `${origin}/`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        name: siteConfig.name,
        alternateName: [
          "Gemini Reset Tracker",
          "Antigravity Quota Tracker",
          "Tracker Gemini Reset",
          "Cek Reset Kuota Gemini",
        ],
        url: homeUrl,
        description: SEO_DESCRIPTION,
        inLanguage: ["en", "id"],
      },
      {
        "@type": "WebApplication",
        "@id": `${homeUrl}#webapp`,
        name: siteConfig.name,
        alternateName: [
          "Gemini Reset Tracker",
          "Antigravity Quota Reset Tracker",
          "Tracker Gemini Reset",
          "Cek Reset Kuota Gemini",
          "Reset Kuota Antigravity",
        ],
        url: homeUrl,
        description: SEO_DESCRIPTION,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        inLanguage: ["en", "id"],
        keywords: SEO_KEYWORDS.join(", "),
        featureList: [
          "Instant reset status badge (RESET RECENTLY vs WAITING)",
          "Hourly automated tracking of @_mohansolo (Varun Mohan) on X",
          "Dynamic Start daily reset heatmap",
          "Varun time (Pacific Time) vs browser local timezone toggle",
          "Verified chronological archive linked directly to original X posts",
          "Bilingual English and Bahasa Indonesia interface",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@type": "Person",
          name: siteConfig.developer.name,
          url: siteConfig.developer.website,
        },
        sameAs: [siteConfig.repositoryUrl],
      },
      {
        "@type": "FAQPage",
        "@id": `${homeUrl}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Gemini Resets?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Gemini Resets is a free, open-source web tracker that monitors Varun Mohan (@_mohansolo) on X for Gemini quota reset announcements in Antigravity, displaying live status, key metrics, a daily heatmap, and a verified archive.",
            },
          },
          {
            "@type": "Question",
            name: "How often does Gemini Resets check for quota resets?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Gemini Resets checks @_mohansolo automatically every 60 minutes and displays when the tracker last checked on the homepage.",
            },
          },
          {
            "@type": "Question",
            name: "How can I verify a Gemini quota reset announcement?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Every recorded reset in Gemini Resets includes a direct link to the original announcement post on X (https://x.com/_mohansolo) along with timestamps viewable in Pacific Time (Varun time) or your local timezone.",
            },
          },
          {
            "@type": "Question",
            name: "Bagaimana cara cek reset kuota Gemini di Antigravity?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Buka Gemini Resets untuk melihat status reset kuota Gemini terbaru secara instan, heatmap harian, dan arsip pengumuman terverifikasi dari @_mohansolo di X yang dicek otomatis setiap 60 menit.",
            },
          },
        ],
      },
    ],
  };
}

export function buildLlmsTxt(rawSiteUrl?: string): string {
  const origin = getSiteOrigin(rawSiteUrl);

  return [
    `# ${siteConfig.name}`,
    "",
    `> ${SEO_DESCRIPTION}`,
    "> Ringkasan (ID): Tracker gratis untuk cek reset kuota Gemini di Antigravity secara otomatis setiap 60 menit dari akun X @_mohansolo, lengkap dengan status instan, heatmap harian, zona waktu lokal/PT, dan tautan bukti tweet asli.",
    "",
    "## Overview",
    `- Canonical URL: ${origin}/`,
    `- Monitored Account: ${siteConfig.targetAccount.name} (${siteConfig.targetAccount.handle}, ${siteConfig.targetAccount.profileUrl})`,
    "- Update Cadence: Automated hourly checks (every 60 minutes)",
    "- Languages: English (default) and Bahasa Indonesia",
    "- Timezones: Pacific Time (America/Los_Angeles / Varun time) and viewer local timezone",
    `- Creator: ${siteConfig.developer.name} (${siteConfig.developer.website})`,
    `- Source Code: ${siteConfig.repositoryUrl}`,
    "",
    "## Key Pages",
    `- [Live Tracker & Heatmap](${origin}/): Current reset status (RESET RECENTLY within 24h vs WAITING), key metrics, Dynamic Start daily heatmap, and verified announcement archive.`,
    `- [Community Notes](${origin}/notes): Public sticky notes wall and community messages.`,
    `- [Changelog](${origin}/changelog): Version history and release notes.`,
    "",
    "## Machine-Readable Data",
    `- [Public Resets JSON API](${origin}/api/resets): Cached JSON payload containing latest resets, computed metrics, hero state, and sync status.`,
    `- [Sitemap](${origin}/sitemap.xml): XML sitemap of public pages.`,
    "",
  ].join("\n");
}

/**
 * Serializes JSON-LD safely for inline `<script type="application/ld+json">`.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
