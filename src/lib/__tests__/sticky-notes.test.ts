import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNPINNED_ORDER,
  DUMMY_STICKY_NOTES,
  HOME_VISIBLE_NOTES,
  STICKY_NOTE_COLORS,
  STICKY_NOTE_MESSAGE_MAX,
  STICKY_NOTE_NAME_MAX,
  STICKY_NOTE_TEMPLATES,
  containsUrlLikePattern,
  resolveStickyNoteColor,
  sortStickyNotes,
  validateStickyNoteInput,
  type StickyNote,
} from "../sticky-notes";

describe("sticky-notes domain helpers", () => {
  it("provides 8 dummy notes (above the 6-note home cap) covering all 5 templates, all 5 colors, pinned, and maker love", () => {
    expect(HOME_VISIBLE_NOTES).toBe(6);
    expect(DUMMY_STICKY_NOTES).toHaveLength(8);
    expect(DUMMY_STICKY_NOTES.length).toBeGreaterThan(HOME_VISIBLE_NOTES);

    const templates = new Set(DUMMY_STICKY_NOTES.map((note) => note.template));
    for (const template of STICKY_NOTE_TEMPLATES) {
      expect(templates.has(template)).toBe(true);
    }

    const colors = new Set(DUMMY_STICKY_NOTES.map((note) => note.color));
    for (const color of STICKY_NOTE_COLORS) {
      expect(colors.has(color)).toBe(true);
    }

    expect(DUMMY_STICKY_NOTES.some((note) => note.isPinned)).toBe(true);
    expect(DUMMY_STICKY_NOTES.some((note) => note.lovedByMaker)).toBe(true);
  });

  it("sorts pinned notes by pinOrder ascending first, then unpinned notes newest first", () => {
    const notes: StickyNote[] = [
      {
        id: "old-unpinned",
        authorName: "A",
        message: "First",
        mood: null,
        color: "butter",
        template: "classic-tape",
        isPinned: false,
        pinOrder: DEFAULT_UNPINNED_ORDER,
        lovedByMaker: false,
        createdAt: "2026-11-24T10:00:00.000Z",
      },
      {
        id: "pin-second",
        authorName: "D",
        message: "Pinned #2",
        mood: "vibe",
        color: "lavender",
        template: "ticket-stub",
        isPinned: true,
        pinOrder: 2,
        lovedByMaker: true,
        createdAt: "2026-11-26T12:00:00.000Z",
      },
      {
        id: "new-unpinned",
        authorName: "B",
        message: "Second",
        mood: "idea",
        color: "sky",
        template: "pixel-window",
        isPinned: false,
        pinOrder: DEFAULT_UNPINNED_ORDER,
        lovedByMaker: true,
        createdAt: "2026-11-26T10:00:00.000Z",
      },
      {
        id: "pin-first",
        authorName: "C",
        message: "Pinned #1",
        mood: "thanks",
        color: "mint",
        template: "lined-pad",
        isPinned: true,
        pinOrder: 1,
        lovedByMaker: true,
        createdAt: "2026-11-20T10:00:00.000Z",
      },
    ];

    const sorted = sortStickyNotes(notes);
    expect(sorted.map((item) => item.id)).toEqual([
      "pin-first",
      "pin-second",
      "new-unpinned",
      "old-unpinned",
    ]);
  });

  it("resolves explicit colors directly and picks a valid palette color for random", () => {
    expect(resolveStickyNoteColor("lavender")).toBe("lavender");
    expect(resolveStickyNoteColor("random", () => 0)).toBe(
      STICKY_NOTE_COLORS[0],
    );
    expect(resolveStickyNoteColor("random", () => 0.99)).toBe(
      STICKY_NOTE_COLORS[STICKY_NOTE_COLORS.length - 1],
    );
  });

  it("blocks URLs and spam domains without false positives on normal text", () => {
    expect(containsUrlLikePattern("Check https://spam.example")).toBe(true);
    expect(containsUrlLikePattern("visit www.promo-site.com")).toBe(true);
    expect(containsUrlLikePattern("join t.me/freebonus")).toBe(true);
    expect(containsUrlLikePattern("promo at slotgacor.xyz")).toBe(true);

    expect(containsUrlLikePattern("Thanks for v0.2.0! Love it.")).toBe(false);
    expect(containsUrlLikePattern("Avg interval is 6.0d right now")).toBe(false);
    expect(containsUrlLikePattern("e.g. Raka")).toBe(false);
  });

  it("validates required fields, max lengths, and URL blocking", () => {
    expect(
      validateStickyNoteInput({
        authorName: "   ",
        message: "",
        mood: null,
        colorChoice: "random",
        template: "classic-tape",
      }),
    ).toEqual({
      ok: false,
      errors: {
        authorName: "required",
        message: "required",
      },
    });

    expect(
      validateStickyNoteInput({
        authorName: "a".repeat(STICKY_NOTE_NAME_MAX + 1),
        message: "b".repeat(STICKY_NOTE_MESSAGE_MAX + 1),
        mood: "feedback",
        colorChoice: "peach",
        template: "ticket-stub",
      }),
    ).toEqual({
      ok: false,
      errors: {
        authorName: "too_long",
        message: "too_long",
      },
    });

    expect(
      validateStickyNoteInput({
        authorName: "promo.com",
        message: "Visit https://example.com",
        mood: "thanks",
        colorChoice: "butter",
        template: "classic-tape",
      }),
    ).toEqual({
      ok: false,
      errors: {
        authorName: "contains_url",
        message: "contains_url",
      },
    });

    expect(
      validateStickyNoteInput({
        authorName: "  Raka  ",
        message: "  Hello maker!  ",
        mood: "thanks",
        colorChoice: "butter",
        template: "polaroid-pin",
      }),
    ).toEqual({
      ok: true,
      value: {
        authorName: "Raka",
        message: "Hello maker!",
        mood: "thanks",
        colorChoice: "butter",
        template: "polaroid-pin",
      },
    });
  });
});
