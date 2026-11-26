import { describe, expect, it } from "vitest";
import { SocialDataXProvider } from "../x-provider";

describe("SocialDataXProvider", () => {
  it("builds search query with since_id, filters retweets/replies, and sorts ascending", async () => {
    let capturedUrl = "";
    let capturedAuth = "";

    const mockFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("Authorization") ?? "";

      return new Response(
        JSON.stringify({
          tweets: [
            {
              id_str: "1860000000000000200",
              full_text: "Resetting Gemini quota for all Antigravity users!",
              tweet_created_at: "2026-11-26T10:00:00.000000Z",
            },
            {
              id_str: "1860000000000000150",
              full_text: "Rest will happen shortly!",
              tweet_created_at: "2026-11-25T18:00:00.000000Z",
            },
            {
              id_str: "1860000000000000100",
              full_text: "Already seen tweet",
              tweet_created_at: "2026-11-24T10:00:00.000000Z",
            },
            {
              id_str: "1860000000000000250",
              full_text: "RT @someone: retweeted",
              tweet_created_at: "2026-11-26T11:00:00.000000Z",
              retweeted_status: { id_str: "999" },
            },
            {
              id_str: "1860000000000000260",
              full_text: "@user reply tweet",
              tweet_created_at: "2026-11-26T11:05:00.000000Z",
              in_reply_to_status_id_str: "888",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const provider = new SocialDataXProvider({
      apiKey: "socialdata-test-key",
      fetchImpl: mockFetch,
    });

    const tweets = await provider.fetchNewTweets(
      "@_mohansolo",
      "1860000000000000100",
    );

    expect(capturedAuth).toBe("Bearer socialdata-test-key");
    const parsedUrl = new URL(capturedUrl);
    expect(parsedUrl.searchParams.get("query")).toBe(
      "from:_mohansolo -filter:retweets -filter:replies since_id:1860000000000000100",
    );

    expect(tweets.map((t) => t.tweetId)).toEqual([
      "1860000000000000150",
      "1860000000000000200",
    ]);
    expect(tweets[1].tweetUrl).toBe(
      "https://x.com/_mohansolo/status/1860000000000000200",
    );
  });

  it("throws sanitized HTTP error without exposing API key", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("Service Unavailable", { status: 503 });

    const provider = new SocialDataXProvider({
      apiKey: "secret-socialdata-key",
      fetchImpl: mockFetch,
    });

    await expect(provider.fetchNewTweets("_mohansolo")).rejects.toThrow(
      "SocialData API responded with HTTP 503",
    );
  });
});
