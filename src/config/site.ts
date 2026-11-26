export type DeveloperLinkId = "website" | "github" | "linkedin" | "instagram";

export interface DeveloperLink {
  id: DeveloperLinkId;
  label: string;
  href: string;
}

export const siteConfig = {
  name: "Gemini Resets",
  shortDescription:
    "We watch @_mohansolo for Gemini reset announcements, so you don't have to.",
  targetAccount: {
    handle: "@_mohansolo",
    username: "_mohansolo",
    name: "Varun Mohan",
    profileUrl: "https://x.com/_mohansolo",
    timezone: "America/Los_Angeles",
  },
  defaultLocale: "en",
  developer: {
    name: "Fajri Farid",
    fullName: "Muh. Fajri Farid",
    website: "https://fajrifarid.com",
    github: "https://github.com/fajri-farid",
    linkedin: "https://www.linkedin.com/in/muhfajrifarid/",
    instagram: "https://www.instagram.com/fajri_farid/",
  },
} as const;

function isValidDeveloperUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    // Hindari merender tautan beranda generik Instagram tanpa path username.
    if (
      (parsed.hostname === "instagram.com" ||
        parsed.hostname === "www.instagram.com") &&
      (parsed.pathname === "/" || parsed.pathname === "")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mengembalikan daftar tautan publik developer yang valid dan siap dirender di footer.
 */
export function getDeveloperLinks(): DeveloperLink[] {
  const candidates: DeveloperLink[] = [
    { id: "website", label: "fajrifarid.com", href: siteConfig.developer.website },
    { id: "github", label: "GitHub", href: siteConfig.developer.github },
    { id: "linkedin", label: "LinkedIn", href: siteConfig.developer.linkedin },
    { id: "instagram", label: "Instagram", href: siteConfig.developer.instagram },
  ];

  return candidates.filter((item) => isValidDeveloperUrl(item.href));
}
