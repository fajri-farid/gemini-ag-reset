import "server-only";
import { buildCanonicalTweetUrl } from "@/lib/tweet-url";

export interface FetchedTweet {
  tweetId: string;
  tweetText: string;
  createdAt: string;
  tweetUrl: string;
}

export interface XDataProvider {
  fetchNewTweets(
    username: string,
    sinceId?: string | null,
  ): Promise<FetchedTweet[]>;
}

interface SocialDataRawTweet {
  id_str?: unknown;
  id?: unknown;
  full_text?: unknown;
  text?: unknown;
  tweet_created_at?: unknown;
  retweeted_status?: unknown;
  in_reply_to_status_id_str?: unknown;
}

interface SocialDataSearchResponse {
  tweets?: unknown;
}

const NUMERIC_ID_REGEX = /^\d+$/;

export class SocialDataXProvider implements XDataProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: { apiKey?: string; fetchImpl?: typeof fetch }) {
    this.apiKey = (
      options?.apiKey ??
      process.env.SOCIALDATA_API_KEY ??
      ""
    ).trim();
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async fetchNewTweets(
    username: string,
    sinceId?: string | null,
  ): Promise<FetchedTweet[]> {
    if (!this.apiKey) {
      throw new Error("SOCIALDATA_API_KEY is not configured.");
    }

    const cleanUsername = username.replace(/^@/, "").trim();
    if (!cleanUsername) {
      throw new Error("Target X username is empty.");
    }

    const cleanSinceId = sinceId?.trim() ?? "";
    const hasValidSinceId = NUMERIC_ID_REGEX.test(cleanSinceId);
    const queryParts = [`from:${cleanUsername}`, "-filter:retweets", "-filter:replies"];
    if (hasValidSinceId) {
      queryParts.push(`since_id:${cleanSinceId}`);
    }

    const searchParams = new URLSearchParams({
      query: queryParts.join(" "),
      type: "Latest",
    });

    const response = await this.fetchImpl(
      `https://api.socialdata.tools/twitter/search?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`SocialData API responded with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as SocialDataSearchResponse;
    const rawTweets = Array.isArray(payload?.tweets)
      ? (payload.tweets as SocialDataRawTweet[])
      : [];

    const sinceIdBigInt = hasValidSinceId ? BigInt(cleanSinceId) : null;
    const parsed: FetchedTweet[] = [];

    for (const item of rawTweets) {
      if (!item || typeof item !== "object") {
        continue;
      }

      // Double-guard terhadap retweet dan reply yang tidak relevan.
      if (
        item.retweeted_status !== undefined &&
        item.retweeted_status !== null
      ) {
        continue;
      }
      if (
        typeof item.in_reply_to_status_id_str === "string" &&
        item.in_reply_to_status_id_str.trim().length > 0
      ) {
        continue;
      }

      const rawId =
        typeof item.id_str === "string"
          ? item.id_str.trim()
          : typeof item.id === "number" || typeof item.id === "bigint"
            ? String(item.id)
            : "";

      if (!NUMERIC_ID_REGEX.test(rawId)) {
        continue;
      }

      if (sinceIdBigInt !== null && BigInt(rawId) <= sinceIdBigInt) {
        continue;
      }

      const rawText =
        typeof item.full_text === "string"
          ? item.full_text
          : typeof item.text === "string"
            ? item.text
            : "";
      const tweetText = rawText.trim();
      if (!tweetText) {
        continue;
      }

      const rawCreatedAt =
        typeof item.tweet_created_at === "string"
          ? item.tweet_created_at.trim()
          : "";
      const createdDate = new Date(rawCreatedAt);
      if (!rawCreatedAt || Number.isNaN(createdDate.getTime())) {
        continue;
      }

      parsed.push({
        tweetId: rawId,
        tweetText,
        createdAt: createdDate.toISOString(),
        tweetUrl: buildCanonicalTweetUrl(rawId, cleanUsername),
      });
    }

    return parsed.sort((a, b) => {
      const idA = BigInt(a.tweetId);
      const idB = BigInt(b.tweetId);
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });
  }
}

export function createDefaultXDataProvider(): XDataProvider {
  return new SocialDataXProvider();
}
