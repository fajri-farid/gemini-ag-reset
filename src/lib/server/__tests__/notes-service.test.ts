import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { NoteModerator } from "../note-moderator";
import { InMemoryNotesRepository } from "../notes-repository";
import { submitPublicNote, submitSiteLove } from "../notes-service";
import { InMemoryRateLimiter } from "../rate-limit";

function noteMutation(now = new Date()) {
  return { requestId: randomUUID(), submittedAt: now.getTime() };
}

function loveMutation(delta: number, day = "2026-11-27") {
  return { delta, day, batchId: randomUUID() };
}

function createCleanModerator(): NoteModerator {
  return {
    moderate: vi.fn(async () => ({
      isSafe: true,
      category: "clean" as const,
      reason: "Friendly note.",
    })),
  };
}

describe("notes-service 5-layer anti-spam & site love capping", () => {
  it("silently drops honeypot submissions before calling Gemini or writing DB", async () => {
    const repo = new InMemoryNotesRepository();
    const rateLimiter = new InMemoryRateLimiter();
    const moderator = createCleanModerator();

    const result = await submitPublicNote(
      {
        ...noteMutation(),
        authorName: "Bot",
        message: "Hello",
        colorChoice: "butter",
        template: "classic-tape",
        website: "https://bot-trap.example",
      },
      "203.0.113.10",
      { repository: repo, rateLimiter, moderator },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.honeypotTriggered).toBe(true);
      expect(result.note).toBeUndefined();
    }
    expect(moderator.moderate).not.toHaveBeenCalled();
    expect((await repo.getSiteStats()).publishedNotesCount).toBe(0);
  });

  it("blocks URLs in layer 2 without calling Gemini", async () => {
    const repo = new InMemoryNotesRepository();
    const rateLimiter = new InMemoryRateLimiter();
    const moderator = createCleanModerator();

    const result = await submitPublicNote(
      {
        ...noteMutation(),
        authorName: "Spammer",
        message: "Visit https://spam.example for deals",
        colorChoice: "sky",
        template: "classic-tape",
      },
      "203.0.113.11",
      { repository: repo, rateLimiter, moderator },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      code: "contains_url",
    });
    expect(moderator.moderate).not.toHaveBeenCalled();
  });

  it("enforces 3 notes per browser per hour before calling Gemini", async () => {
    const repo = new InMemoryNotesRepository();
    const rateLimiter = new InMemoryRateLimiter();
    const moderator = createCleanModerator();
    const now = new Date("2026-11-27T10:00:00.000Z");

    for (let i = 0; i < 3; i += 1) {
      const okResult = await submitPublicNote(
        {
          ...noteMutation(now),
          authorName: `User ${i}`,
          message: `Nice tracker #${i}`,
          colorChoice: "butter",
          template: "classic-tape",
        },
        "203.0.113.12",
        { repository: repo, rateLimiter, moderator, now },
      );
      expect(okResult.ok).toBe(true);
    }

    const fourth = await submitPublicNote(
      {
        ...noteMutation(now),
        authorName: "User 4",
        message: "One too many",
        colorChoice: "butter",
        template: "classic-tape",
      },
      "203.0.113.12",
      { repository: repo, rateLimiter, moderator, now },
    );

    expect(fourth).toMatchObject({
      ok: false,
      status: 429,
      code: "rate_limited",
    });
    expect(moderator.moderate).toHaveBeenCalledTimes(3);
  });

  it("rejects unsafe content (422) and fails closed on Gemini errors (503)", async () => {
    const repo = new InMemoryNotesRepository();
    const rateLimiter = new InMemoryRateLimiter();

    const toxicModerator: NoteModerator = {
      moderate: vi.fn(async () => ({
        isSafe: false,
        category: "spam_or_promo" as const,
        reason: "Commercial promotion detected.",
      })),
    };

    const rejected = await submitPublicNote(
      {
        ...noteMutation(),
        authorName: "Seller",
        message: "DM IG gue jual akun murah",
        colorChoice: "mint",
        template: "lined-pad",
      },
      "203.0.113.13",
      { repository: repo, rateLimiter, moderator: toxicModerator },
    );
    expect(rejected).toMatchObject({
      ok: false,
      status: 422,
      code: "moderation_rejected",
    });

    const failingModerator: NoteModerator = {
      moderate: vi.fn(async () => {
        throw new Error("Gemini timeout");
      }),
    };

    const unavailable = await submitPublicNote(
      {
        ...noteMutation(),
        authorName: "Raka",
        message: "Friendly hello!",
        colorChoice: "mint",
        template: "lined-pad",
      },
      "203.0.113.14",
      { repository: repo, rateLimiter, moderator: failingModerator },
    );
    expect(unavailable).toMatchObject({
      ok: false,
      status: 503,
      code: "moderation_unavailable",
    });
    expect((await repo.getSiteStats()).publishedNotesCount).toBe(0);
  });

  it("partially accepts a love batch and never counts a replay twice", async () => {
    const repository = new InMemoryNotesRepository({ loveCount: 10 });
    const now = new Date("2026-11-27T10:00:00.000Z");
    const deps = { repository, now };
    const first = await submitSiteLove(loveMutation(40), "visitor-one", deps);
    const lastBatch = loveMutation(20);
    const last = await submitSiteLove(lastBatch, "visitor-one", deps);
    const retry = await submitSiteLove(lastBatch, "visitor-one", deps);
    const denied = await submitSiteLove(loveMutation(1), "visitor-one", deps);
    const neighbor = await submitSiteLove(loveMutation(20), "visitor-two", deps);

    expect(first).toMatchObject({ ok: true, acceptedDelta: 40, remainingDaily: 10 });
    expect(last).toMatchObject({ ok: true, acceptedDelta: 10, remainingDaily: 0 });
    expect(retry).toEqual(last);
    expect(denied).toMatchObject({ ok: false, status: 429, code: "rate_limited", remainingDaily: 0 });
    expect(neighbor).toMatchObject({ ok: true, acceptedDelta: 20, remainingDaily: 30 });
    expect((await repository.getSiteStats()).loveCount).toBe(80);
  });

  it("replays a confirmed batch across UTC midnight without taking the new day's quota", async () => {
    const repository = new InMemoryNotesRepository();
    const firstDay = new Date("2026-11-27T23:59:59.000Z");
    const secondDay = new Date("2026-11-28T00:00:00.000Z");
    const batch = loveMutation(50);
    await submitSiteLove(batch, "visitor", { repository, now: firstDay });
    expect(await submitSiteLove(batch, "visitor", { repository, now: secondDay }))
      .toMatchObject({ ok: true, acceptedDelta: 50 });
    expect(await submitSiteLove(loveMutation(1), "visitor", { repository, now: secondDay }))
      .toMatchObject({ ok: false, status: 409 });
    expect(await submitSiteLove(loveMutation(50, "2026-11-28"), "visitor", { repository, now: secondDay }))
      .toMatchObject({ ok: true, acceptedDelta: 50, remainingDaily: 0 });
    expect((await repository.getSiteStats()).loveCount).toBe(100);
  });

  it("moderates a completed note once and refuses a replay after it is deleted", async () => {
    const repository = new InMemoryNotesRepository();
    const moderator = createCleanModerator();
    const rateLimiter = new InMemoryRateLimiter();
    const deps = { repository, moderator, rateLimiter };
    const draft = { ...noteMutation(), authorName: "Reader", message: "Helpful, thank you!" };
    const first = await submitPublicNote(draft, "visitor", deps);
    if (!first.ok || !first.note) throw new Error("Expected a published note");
    expect(await submitPublicNote(draft, "visitor", deps))
      .toMatchObject({ ok: true, note: { id: first.note.id }, replayed: true });
    expect((await repository.getSiteStats()).publishedNotesCount).toBe(1);
    await repository.deleteNoteAdmin(first.note.id);
    expect(await submitPublicNote(draft, "visitor", deps)).toMatchObject({ ok: false, status: 409 });
    expect((await repository.getSiteStats()).publishedNotesCount).toBe(0);
    expect(moderator.moderate).toHaveBeenCalledTimes(1);
  });

  it("uses the ID tie-breaker when a matching note shares a timestamp", async () => {
    const now = "2026-11-27T10:00:00.000Z";
    const common = { createdAt: now, authorName: "A", message: "B", color: "butter",
      template: "classic-tape", pinOrder: 999_999, isPinned: false,
      lovedByMaker: true, mood: "idea", status: "published" } as const;
    const repo = new InMemoryNotesRepository({
      notes: [{ ...common, id: "b" }, { ...common, id: "a" }, { ...common, id: "c", status: "hidden" }],
    });
    const first = await repo.listPublishedNotes({ limit: 1, mood: "idea", lovedOnly: true });
    expect(first.items.map(({ id }) => id)).toEqual(["a"]);
    expect(first.nextCursor?.id).toBe("a");
    const next = await repo.listPublishedNotes({ limit: 1, mood: "idea", lovedOnly: true, cursor: first.nextCursor });
    expect(next.items.map(({ id }) => id)).toEqual(["b"]);
    expect(next.nextCursor).toBeNull();
  });

  it("reorders pinned notes deterministically via InMemoryNotesRepository", async () => {
    const repo = new InMemoryNotesRepository();
    const n1 = await repo.createNote({
      authorName: "A",
      message: "First",
      mood: null,
      color: "butter",
      template: "classic-tape",
    });
    const n2 = await repo.createNote({
      authorName: "B",
      message: "Second",
      mood: "idea",
      color: "sky",
      template: "pixel-window",
    });

    await repo.updateNoteAdmin(n1.id, { isPinned: true });
    await repo.updateNoteAdmin(n2.id, { isPinned: true });
    await repo.reorderPinnedNotes([n2.id, n1.id], [n1.id, n2.id]);
    const page = await repo.listPublishedNotes({ limit: 6 });
    expect(page.items.map((item) => item.id)).toEqual([n2.id, n1.id]);
    expect(page.items.map((item) => item.pinOrder)).toEqual([1, 2]);
    await expect(repo.reorderPinnedNotes([n2.id, n1.id], [n1.id, n2.id])).rejects.toThrow("pinned list changed");
    await repo.deleteNoteAdmin(n2.id);
    await expect(repo.reorderPinnedNotes([n2.id, n1.id], [n2.id, n1.id])).rejects.toThrow("pinned list changed");
    expect((await repo.listPublishedNotes()).items.map(({ id }) => id)).toEqual([n1.id]);
  });
});
