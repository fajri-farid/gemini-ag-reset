export const DEFAULT_SITE_URL = "https://geminireset.fajrifarid.com";

/**
 * Resolves the canonical public URL from `NEXT_PUBLIC_SITE_URL`, accepting only
 * HTTP(S) origins and falling back safely to the production default.
 */
export function resolveSiteUrl(rawUrl?: string): URL {
  const candidate = (rawUrl ?? process.env.NEXT_PUBLIC_SITE_URL)?.trim();
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed;
      }
    } catch {
      // Fall back to default production URL when env formatting is invalid.
    }
  }

  return new URL(DEFAULT_SITE_URL);
}

/**
 * Returns the canonical origin (`https://domain.tld`) without trailing slashes.
 */
export function getSiteOrigin(rawUrl?: string): string {
  return resolveSiteUrl(rawUrl).origin;
}

/**
 * Returns the clean host string (`domain.tld` or `localhost:3000`) for card watermarks.
 */
export function getSiteDisplayHost(rawUrl?: string): string {
  return resolveSiteUrl(rawUrl).host;
}
