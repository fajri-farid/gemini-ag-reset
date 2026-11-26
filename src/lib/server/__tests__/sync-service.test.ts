import { describe, expect, it } from "vitest";
import type { ResetClassifier } from "../reset-classifier";
import { InMemoryResetRepository } from "../reset-repository";
import { runSync } from "../sync-service";
import type { FetchedTweet, XDataProvider } from "../x-provider";

function makeTweet(
  tweetId: string,
  tweetText: string,
  createdAt: string,
): FetchedTweet {
  return {
    tweetId,
    tweetText,
    createdAt,
    tweetUrl: `https://x.com/_mohansolo/status/${tweetId}`,
  };
}

describe("runSync", () => {
  it("updates lastCheckedAt, revalidates, and logs ok with no new tweets", async () => {
    const repo = new InMemoryResetRepository();
    const archiveInvalidations: boolean[] = [];

    const result = await runSync({
      trigger: "cron",
      repository: repo,
      xProvider: { async fetchNewTweets() { return []; } },
      classifier: {
        async classify() {
          throw new Error("Should not classify");
        },
      },
      onRevalidate: (resetsChanged) => {
        archiveInvalidations.push(resetsChanged);
      },
      now: () => new Date("2026-11-26T12:00:00.000Z"),
    });

    expect(result.log.status).toBe("ok");
    expect(result.log.savedCount).toBe(0);
    expect(result.savedResets).toHaveLength(0);
    expect(archiveInvalidations).toEqual([false]);

    const status = await repo.getSyncStatus();
    expect(status.lastCheckedAt).toBe("2026-11-26T12:00:00.000Z");
    expect(status.lastStatus).toBe("ok");
  });

  it("saves qualifying tweets (>= 0.85), skips low-confidence/non-reset tweets, and advances lastSeenTweetId", async () => {
    const repo = new InMemoryResetRepository();
    const archiveInvalidations: boolean[] = [];

    const tweets = [
      makeTweet(
        "1860000000000000300",
        "Enjoy the weekend everyone!",
        "2026-11-25T12:00:00.000Z",
      ),
      makeTweet(
        "1860000000000000301",
        "Maybe quota reset soon?",
        "2026-11-25T16:00:00.000Z",
      ),
      makeTweet(
        "1860000000000000302",
        "Resetting Gemini quota for all Antigravity users!",
        "2026-11-26T10:00:00.000Z",
      ),
    ];

    const xProvider: XDataProvider = {
      async fetchNewTweets() {
        return tweets;
      },
    };
    const classifier: ResetClassifier = {
      async classify(text) {
        if (text.includes("Resetting Gemini quota")) {
          return {
            isReset: true,
            confidence: 0.92,
            summary: "Gemini quota reset for all Antigravity users.",
          };
        }
        if (text.includes("soon")) {
          return {
            isReset: true,
            confidence: 0.72,
            summary: "Uncertain teaser.",
          };
        }
        return {
          isReset: false,
          confidence: 0.1,
          summary: null,
        };
      },
    };

    const result = await runSync({
      trigger: "cron",
      repository: repo,
      xProvider,
      classifier,
      onRevalidate: (resetsChanged) => {
        archiveInvalidations.push(resetsChanged);
      },
      now: () => new Date("2026-11-26T12:00:00.000Z"),
    });

    expect(result.log.status).toBe("ok");
    expect(result.log.fetchedCount).toBe(3);
    expect(result.log.savedCount).toBe(1);
    expect(result.log.skippedCount).toBe(2);
    expect(result.savedResets.map((r) => r.tweetId)).toEqual([
      "1860000000000000302",
    ]);
    expect(archiveInvalidations).toEqual([true]);

    const saved = await repo.listResets();
    expect(saved).toHaveLength(1);
    expect((await repo.getSyncStatus()).lastSeenTweetId).toBe(
      "1860000000000000302",
    );
  });

  it("records x_fetch error without overwriting existing resets", async () => {
    const repo = new InMemoryResetRepository({
      resets: [
        {
          tweetId: "1860000000000000100",
          tweetUrl: "https://x.com/_mohansolo/status/1860000000000000100",
          tweetText: "Existing reset",
          summary: "Existing",
          confidence: 0.99,
          source: "auto",
          resetAt: "2026-11-20T12:00:00.000Z",
          createdAt: "2026-11-20T12:00:00.000Z",
          updatedAt: "2026-11-20T12:00:00.000Z",
        },
      ],
    });

    const result = await runSync({
      trigger: "cron",
      repository: repo,
      xProvider: {
        async fetchNewTweets() {
          throw new Error("SocialData timeout");
        },
      },
      classifier: {
        async classify() {
          return { isReset: false, confidence: 0, summary: null };
        },
      },
    });

    expect(result.log.status).toBe("error");
    expect(result.log.errorStage).toBe("x_fetch");
    expect(result.log.errorMessage).toContain("SocialData timeout");
    expect((await repo.getSyncStatus()).lastStatus).toBe("error");
    expect(await repo.listResets()).toHaveLength(1);
  });

  it("records gemini error without overwriting existing resets", async () => {
    const repo = new InMemoryResetRepository({
      resets: [
        {
          tweetId: "1860000000000000100",
          tweetUrl: "https://x.com/_mohansolo/status/1860000000000000100",
          tweetText: "Existing reset",
          summary: "Existing",
          confidence: 0.99,
          source: "auto",
          resetAt: "2026-11-20T12:00:00.000Z",
          createdAt: "2026-11-20T12:00:00.000Z",
          updatedAt: "2026-11-20T12:00:00.000Z",
        },
      ],
    });

    const result = await runSync({
      trigger: "admin_live",
      repository: repo,
      xProvider: {
        async fetchNewTweets() {
          return [
            makeTweet(
              "1860000000000000200",
              "Quota reset is live",
              "2026-11-26T10:00:00.000Z",
            ),
          ];
        },
      },
      classifier: {
        async classify() {
          throw new Error("Gemini quota exceeded");
        },
      },
    });

    expect(result.log.status).toBe("error");
    expect(result.log.errorStage).toBe("gemini");
    expect((await repo.getSyncStatus()).lastStatus).toBe("error");
    expect(await repo.listResets()).toHaveLength(1);
  });

  it("evaluates tweets in dryRun mode without modifying resets, sync_status, or triggering revalidation", async () => {
    const repo = new InMemoryResetRepository({
      syncStatus: {
        lastSeenTweetId: "1860000000000000100",
        lastStatus: "ok",
      },
    });
    let revalidated = false;

    const result = await runSync({
      trigger: "admin_dry_run",
      dryRun: true,
      repository: repo,
      xProvider: {
        async fetchNewTweets() {
          return [
            makeTweet(
              "1860000000000000400",
              "Quota reset is live!",
              "2026-11-26T11:00:00.000Z",
            ),
          ];
        },
      },
      classifier: {
        async classify() {
          return {
            isReset: true,
            confidence: 0.95,
            summary: "Quota reset live.",
          };
        },
      },
      onRevalidate: () => {
        revalidated = true;
      },
    });

    expect(result.dryRun).toBe(true);
    expect(result.log.trigger).toBe("admin_dry_run");
    expect(result.log.status).toBe("ok");
    expect(result.log.evaluatedTweets).toEqual([
      {
        tweetId: "1860000000000000400",
        textPreview: "Quota reset is live!",
        isReset: true,
        confidence: 0.95,
        summary: "Quota reset live.",
        saved: false,
      },
    ]);
    expect(result.savedResets).toHaveLength(0);
    expect(await repo.listResets()).toHaveLength(0);
    expect((await repo.getSyncStatus()).lastSeenTweetId).toBe(
      "1860000000000000100",
    );
    expect(revalidated).toBe(false);
  });
});
