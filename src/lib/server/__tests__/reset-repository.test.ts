import { describe, expect, it } from "vitest";
import { InMemoryResetRepository, MAX_SYNC_LOGS } from "../reset-repository";

describe("InMemoryResetRepository", () => {
  it("upserts resets idempotently by tweetId and preserves createdAt", async () => {
    const repo = new InMemoryResetRepository();

    const created = await repo.upsertReset({
      tweetId: "1860000000000000001",
      tweetText: "Resetting Gemini quota for all users!",
      summary: "Initial summary",
      confidence: 0.95,
      source: "auto",
      resetAt: "2026-11-20T18:00:00.000Z",
    });

    const updated = await repo.upsertReset({
      tweetId: "1860000000000000001",
      tweetText: "Resetting Gemini quota for all users!",
      summary: "Refined summary",
      confidence: 0.99,
      source: "manual",
      resetAt: "2026-11-20T18:00:00.000Z",
    });

    const all = await repo.listResets();
    expect(all).toHaveLength(1);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.summary).toBe("Refined summary");
    expect(updated.tweetUrl).toBe(
      "https://x.com/_mohansolo/status/1860000000000000001",
    );
  });

  it("lists resets descending, updates existing records, and deletes cleanly", async () => {
    const repo = new InMemoryResetRepository();

    await repo.upsertReset({
      tweetId: "1001",
      tweetText: "Older reset",
      source: "manual",
      resetAt: "2026-11-10T10:00:00.000Z",
    });
    await repo.upsertReset({
      tweetId: "1002",
      tweetText: "Newer reset",
      source: "auto",
      resetAt: "2026-11-22T10:00:00.000Z",
    });

    const list = await repo.listResets();
    expect(list.map((r) => r.tweetId)).toEqual(["1002", "1001"]);

    expect(
      await repo.updateReset("missing-id", { summary: "Nope" }),
    ).toBeNull();

    const patched = await repo.updateReset("1001", {
      summary: "Updated manual summary",
    });
    expect(patched?.summary).toBe("Updated manual summary");

    expect(await repo.deleteReset("1001")).toBe(true);
    expect(await repo.deleteReset("1001")).toBe(false);
    expect((await repo.listResets()).map((r) => r.tweetId)).toEqual(["1002"]);
  });

  it("reads default syncStatus and applies partial updates", async () => {
    const repo = new InMemoryResetRepository();
    const initial = await repo.getSyncStatus();

    expect(initial.lastStatus).toBe("ok");
    expect(initial.lastCheckedAt).toBeNull();
    expect(initial.trackingStartedAt).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);

    const updated = await repo.updateSyncStatus({
      lastCheckedAt: "2026-11-26T10:00:00.000Z",
      lastSeenTweetId: "1002",
      lastStatus: "error",
      lastErrorMessage: "Upstream timeout",
    });

    expect(updated.lastStatus).toBe("error");
    expect(updated.lastSeenTweetId).toBe("1002");
    expect(updated.trackingStartedAt).toBe(initial.trackingStartedAt);
  });

  it("caps sync_logs at MAX_SYNC_LOGS (50) retaining the newest entries", async () => {
    const repo = new InMemoryResetRepository();

    for (let i = 1; i <= 55; i += 1) {
      const minute = String(i % 60).padStart(2, "0");
      const hour = String(Math.floor(i / 60)).padStart(2, "0");
      await repo.appendSyncLog({
        ranAt: `2026-11-26T${hour}:${minute}:00.000Z`,
        trigger: "cron",
        status: "ok",
        fetchedCount: i,
        savedCount: 0,
        skippedCount: i,
        durationMs: 120,
        errorStage: "none",
        errorMessage: null,
        evaluatedTweets: [],
      });
    }

    const logs = await repo.listSyncLogs();
    expect(logs).toHaveLength(MAX_SYNC_LOGS);
    expect(logs[0].fetchedCount).toBe(55);
    expect(logs[logs.length - 1].fetchedCount).toBe(6);
  });
});
