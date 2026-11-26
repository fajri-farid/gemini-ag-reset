import { siteConfig } from "@/config/site";

const ALLOWED_X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

const NUMERIC_TWEET_ID_REGEX = /^\d{10,25}$/;
const STATUS_PATH_REGEX = /^\/[^/]+\/status\/(\d{10,25})(?:\/.*)?$/i;

/**
 * Mengekstrak ID tweet numerik dari ID mentah maupun URL X/Twitter resmi.
 * Mengembalikan null bila domain tidak valid atau ID tweet tidak ditemukan.
 */
export function extractTweetIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (NUMERIC_TWEET_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    if (!ALLOWED_X_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }

    const match = STATUS_PATH_REGEX.exec(parsed.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function buildCanonicalTweetUrl(
  tweetId: string,
  username: string = siteConfig.targetAccount.username,
): string {
  return `https://x.com/${username}/status/${tweetId}`;
}
