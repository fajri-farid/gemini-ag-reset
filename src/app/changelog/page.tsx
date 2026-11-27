import type { Metadata } from "next";
import { ChangelogPageClient } from "@/components/changelog/ChangelogPageClient";
import { siteConfig } from "@/config/site";

const CHANGELOG_DESCRIPTION =
  "Version history and release notes for Gemini Resets.";

export const metadata: Metadata = {
  title: `Changelog — ${siteConfig.name}`,
  description: CHANGELOG_DESCRIPTION,
  alternates: {
    canonical: "/changelog",
  },
  openGraph: {
    title: `Changelog — ${siteConfig.name}`,
    description: CHANGELOG_DESCRIPTION,
    siteName: siteConfig.name,
    url: "/changelog",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Changelog — ${siteConfig.name}`,
    description: CHANGELOG_DESCRIPTION,
  },
};

export default function ChangelogPage() {
  return <ChangelogPageClient />;
}
