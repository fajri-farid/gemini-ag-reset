export type ShareCardRatio = "4x5" | "9x16";
export type ShareCardVariant = ShareCardRatio | "og";

export const SHARE_CARD_DIMENSIONS: Record<
  ShareCardVariant,
  { width: number; height: number }
> = {
  "4x5": { width: 1080, height: 1350 },
  "9x16": { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
};

export const TWEET_ID_REGEX = /^\d{1,30}$/;

export const VARUN_AVATAR_PUBLIC_PATH = "/V0Y7u33_.jpg";

/**
 * Builds a clean, predictable PNG filename for locally rendered share cards.
 */
export function buildShareCardFilename({
  ratio,
  tweetId,
}: {
  ratio: ShareCardRatio;
  tweetId?: string | null;
}): string {
  const safeTweetId = tweetId?.trim();
  if (safeTweetId && TWEET_ID_REGEX.test(safeTweetId)) {
    return `gemini-resets-${ratio}-${safeTweetId}.png`;
  }
  return `gemini-resets-${ratio}.png`;
}
