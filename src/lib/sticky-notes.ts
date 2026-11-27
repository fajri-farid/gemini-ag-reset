export type StickyNoteMood = "thanks" | "feedback" | "idea" | "waiting" | "vibe";

export type StickyNoteColor =
  | "butter"
  | "sky"
  | "lavender"
  | "mint"
  | "peach";

export type StickyNoteColorChoice = "random" | StickyNoteColor;

export type StickyNoteTemplate =
  | "classic-tape"
  | "lined-pad"
  | "pixel-window"
  | "ticket-stub"
  | "polaroid-pin";

export type StickyNoteStatus = "published" | "hidden";

export interface StickyNote {
  id: string;
  authorName: string;
  message: string;
  mood: StickyNoteMood | null;
  color: StickyNoteColor;
  template: StickyNoteTemplate;
  isPinned: boolean;
  pinOrder: number;
  lovedByMaker: boolean;
  status?: StickyNoteStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteStats {
  loveCount: number;
  publishedNotesCount: number;
  updatedAt: string;
}

export interface NotesCursor {
  signature?: string;
  id: string;
  isPinned: boolean;
  pinOrder: number;
  createdAt: string;
}

export function noteCursorParams(cursor: NotesCursor): URLSearchParams {
  const params = new URLSearchParams({
    cursorId: cursor.id,
    cursorCreatedAt: cursor.createdAt,
    cursorIsPinned: cursor.isPinned ? "1" : "0",
    cursorPinOrder: String(cursor.pinOrder),
  });
  if (cursor.signature) params.set("cursorSignature", cursor.signature);
  return params;
}

export interface PublicNotesPage {
  items: StickyNote[];
  nextCursor: NotesCursor | null;
  totalCount: number;
}

export interface StickyNoteDraftInput {
  authorName: string;
  message: string;
  mood: StickyNoteMood | null;
  colorChoice: StickyNoteColorChoice;
  template: StickyNoteTemplate;
}

export type StickyNoteFieldError = "required" | "too_long" | "contains_url";

export interface StickyNoteValidationErrors {
  authorName?: StickyNoteFieldError;
  message?: StickyNoteFieldError;
}

export type StickyNoteValidationResult =
  | {
      ok: true;
      value: StickyNoteDraftInput;
    }
  | {
      ok: false;
      errors: StickyNoteValidationErrors;
    };

export const STICKY_NOTE_NAME_MAX = 32;
export const STICKY_NOTE_MESSAGE_MAX = 240;
export const HOME_VISIBLE_NOTES = 6;
export const NOTES_PAGE_SIZE = 18;
export const MAX_PINNED_NOTES = 50;
export const DEFAULT_UNPINNED_ORDER = 999_999;

export const MAX_DAILY_SITE_LOVES = 50;
export const MAX_LOVE_DELTA_PER_REQUEST = MAX_DAILY_SITE_LOVES;
export const LOVE_DEBOUNCE_MS = 5000;
export const MAX_HOURLY_NOTES_PER_VISITOR = 3;

export const STICKY_NOTE_MOODS: readonly StickyNoteMood[] = [
  "thanks",
  "feedback",
  "idea",
  "waiting",
  "vibe",
];

export const STICKY_NOTE_COLORS: readonly StickyNoteColor[] = [
  "butter",
  "sky",
  "lavender",
  "mint",
  "peach",
];

export const STICKY_NOTE_TEMPLATES: readonly StickyNoteTemplate[] = [
  "classic-tape",
  "lined-pad",
  "pixel-window",
  "ticket-stub",
  "polaroid-pin",
];

export const STICKY_NOTE_COLOR_STYLES: Record<
  StickyNoteColor,
  { bg: string; headerBg: string; accent: string; swatch: string }
> = {
  butter: {
    bg: "#FEF3C7",
    headerBg: "#FDE68A",
    accent: "#B45309",
    swatch: "#FDE68A",
  },
  sky: {
    bg: "#DBEAFE",
    headerBg: "#BFDBFE",
    accent: "#1D4ED8",
    swatch: "#BFDBFE",
  },
  lavender: {
    bg: "#EDE9FE",
    headerBg: "#DDD6FE",
    accent: "#6D28D9",
    swatch: "#DDD6FE",
  },
  mint: {
    bg: "#D1FAE5",
    headerBg: "#A7F3D0",
    accent: "#047857",
    swatch: "#A7F3D0",
  },
  peach: {
    bg: "#FFEDD5",
    headerBg: "#FED7AA",
    accent: "#C2410C",
    swatch: "#FED7AA",
  },
};

export const DUMMY_STICKY_NOTES: readonly StickyNote[] = [
  {
    id: "demo-note-1",
    authorName: "Raka",
    message:
      "Thank you for building this! Saves me from refreshing X every hour while pushing through late-night sprints.",
    mood: "thanks",
    color: "butter",
    template: "classic-tape",
    isPinned: true,
    pinOrder: 1,
    lovedByMaker: true,
    status: "published",
    createdAt: "2026-11-26T18:30:00.000Z",
  },
  {
    id: "demo-note-2",
    authorName: "Maya",
    message:
      "Would love a super subtle browser title badge when a new reset drops within 24h. Keep up the clean design!",
    mood: "idea",
    color: "sky",
    template: "pixel-window",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: true,
    status: "published",
    createdAt: "2026-11-26T14:15:00.000Z",
  },
  {
    id: "demo-note-3",
    authorName: "Dion",
    message:
      "Refreshing my coffee and waiting for Varun's next reset post while refactoring backend routes.",
    mood: "waiting",
    color: "mint",
    template: "lined-pad",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: false,
    status: "published",
    createdAt: "2026-11-26T09:45:00.000Z",
  },
  {
    id: "demo-note-4",
    authorName: "Nadia",
    message:
      "The Warm Neo-Brutalism cards and EN/ID switch feel super crisp. Best little Antigravity companion bookmark.",
    mood: "vibe",
    color: "lavender",
    template: "ticket-stub",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: true,
    status: "published",
    createdAt: "2026-11-25T21:10:00.000Z",
  },
  {
    id: "demo-note-5",
    authorName: "Kevin",
    message:
      "Varun time (PT) vs Local time toggle on the heatmap is genuinely helpful for comparing reset windows.",
    mood: "feedback",
    color: "peach",
    template: "polaroid-pin",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: false,
    status: "published",
    createdAt: "2026-11-25T16:20:00.000Z",
  },
  {
    id: "demo-note-6",
    authorName: "Salsa",
    message:
      "Checked in before my morning standup. So glad this tracker exists and stays fast on mobile!",
    mood: "thanks",
    color: "sky",
    template: "classic-tape",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: false,
    status: "published",
    createdAt: "2026-11-25T07:05:00.000Z",
  },
  {
    id: "demo-note-7",
    authorName: "Bima",
    message:
      "A tiny weekly summary digest or RSS feed for reset intervals would be a sweet bonus someday.",
    mood: "idea",
    color: "peach",
    template: "lined-pad",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: true,
    status: "published",
    createdAt: "2026-11-24T19:40:00.000Z",
  },
  {
    id: "demo-note-8",
    authorName: "Tara",
    message:
      "Zero clutter, super snappy load, and the sticker cards look like a cozy desk board!",
    mood: "vibe",
    color: "mint",
    template: "ticket-stub",
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: false,
    status: "published",
    createdAt: "2026-11-24T11:15:00.000Z",
  },
];

const URL_SCHEME_PATTERN = /(?:https?:\/\/|www\.)\S+/i;
const SHORTLINK_PATTERN =
  /\b(?:t\.me|wa\.me|bit\.ly|tinyurl\.com|linktr\.ee|discord\.gg|s\.id|goo\.gl)\/\S*/i;
const DOMAIN_TLD_PATTERN =
  /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|io|co|id|xyz|site|online|shop|vip|club|app|dev|gg|me|ly|to|cc|info|biz|ai|tv)(?:\/\S*)?\b/i;

export function containsUrlLikePattern(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  return (
    URL_SCHEME_PATTERN.test(normalized) ||
    SHORTLINK_PATTERN.test(normalized) ||
    DOMAIN_TLD_PATTERN.test(normalized)
  );
}

export function pickRandomStickyNoteColor(
  randomFn: () => number = Math.random,
): StickyNoteColor {
  const rawIndex = Math.floor(randomFn() * STICKY_NOTE_COLORS.length);
  const safeIndex = Math.min(
    STICKY_NOTE_COLORS.length - 1,
    Math.max(0, Number.isFinite(rawIndex) ? rawIndex : 0),
  );
  return STICKY_NOTE_COLORS[safeIndex] ?? "butter";
}

export function resolveStickyNoteColor(
  choice: StickyNoteColorChoice,
  randomFn: () => number = Math.random,
): StickyNoteColor {
  return choice === "random" ? pickRandomStickyNoteColor(randomFn) : choice;
}

export function sortStickyNotes(notes: readonly StickyNote[]): StickyNote[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    if (a.isPinned && b.isPinned) {
      const orderA = Number.isFinite(a.pinOrder)
        ? a.pinOrder
        : DEFAULT_UNPINNED_ORDER;
      const orderB = Number.isFinite(b.pinOrder)
        ? b.pinOrder
        : DEFAULT_UNPINNED_ORDER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
    }

    const timeA = Date.parse(a.createdAt);
    const timeB = Date.parse(b.createdAt);
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }

    if (a.createdAt !== b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }

    return a.id.localeCompare(b.id);
  });
}

export function validateStickyNoteInput(
  input: StickyNoteDraftInput,
): StickyNoteValidationResult {
  const trimmedName = input.authorName.trim();
  const trimmedMessage = input.message.trim();
  const errors: StickyNoteValidationErrors = {};

  if (trimmedName.length === 0) {
    errors.authorName = "required";
  } else if (trimmedName.length > STICKY_NOTE_NAME_MAX) {
    errors.authorName = "too_long";
  } else if (containsUrlLikePattern(trimmedName)) {
    errors.authorName = "contains_url";
  }

  if (trimmedMessage.length === 0) {
    errors.message = "required";
  } else if (trimmedMessage.length > STICKY_NOTE_MESSAGE_MAX) {
    errors.message = "too_long";
  } else if (containsUrlLikePattern(trimmedMessage)) {
    errors.message = "contains_url";
  }

  if (errors.authorName || errors.message) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      authorName: trimmedName,
      message: trimmedMessage,
      mood: input.mood,
      colorChoice: input.colorChoice,
      template: input.template,
    },
  };
}
