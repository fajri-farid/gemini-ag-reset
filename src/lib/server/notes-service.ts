import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import { MS_PER_DAY } from "@/lib/datetime";
import {
  MAX_LOVE_DELTA_PER_REQUEST,
  STICKY_NOTE_COLORS,
  STICKY_NOTE_MESSAGE_MAX,
  STICKY_NOTE_MOODS,
  STICKY_NOTE_NAME_MAX,
  STICKY_NOTE_TEMPLATES,
  containsUrlLikePattern,
  resolveStickyNoteColor,
  type StickyNote,
  type StickyNoteColorChoice,
  type StickyNoteMood,
  type StickyNoteTemplate,
} from "@/lib/sticky-notes";
import {
  createDefaultNoteModerator,
  isNoteModerationConfigured,
  type NoteModerationCategory,
  type NoteModerator,
} from "./note-moderator";
import { getNotesRepository, NoteConflictError, type NotesRepository } from "./notes-repository";
import { getRateLimiter, type RateLimiter } from "./rate-limit";

const sensitivePattern = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:^|[^\w])\+?\d(?:[\s().-]*\d){8,}(?!\d)/i;

export const CreatePublicNoteSchema = z.object({
  requestId: z.uuid(),
  submittedAt: z.number().int().positive(),
  authorName: z.string().trim().min(1).max(STICKY_NOTE_NAME_MAX),
  message: z.string().trim().min(1).max(STICKY_NOTE_MESSAGE_MAX),
  mood: z.enum(STICKY_NOTE_MOODS).nullable().optional(),
  colorChoice: z
    .enum(["random", ...STICKY_NOTE_COLORS] as [
      StickyNoteColorChoice,
      ...StickyNoteColorChoice[],
    ])
    .default("random"),
  template: z
    .enum(STICKY_NOTE_TEMPLATES as [StickyNoteTemplate, ...StickyNoteTemplate[]])
    .default("classic-tape"),
  website: z.string().max(256).optional(),
});

export const IncrementLoveSchema = z.object({
  batchId: z.uuid(),
  day: z.iso.date(),
  delta: z.number().int().min(1).max(MAX_LOVE_DELTA_PER_REQUEST),
});

export type SubmitPublicNoteResult =
  | {
      ok: true;
      status: 201;
      honeypotTriggered?: boolean;
      replayed?: boolean;
      note?: StickyNote;
    }
  | {
      ok: false;
      status: 400 | 409 | 422 | 429 | 503;
      code:
        | "validation_failed"
        | "contains_url"
        | "submission_unavailable"
        | "rate_limited"
        | "moderation_rejected"
        | "moderation_unavailable";
      error: string;
      category?: NoteModerationCategory;
    };

export type SubmitSiteLoveResult =
  | {
      ok: true;
      status: 200;
      acceptedDelta: number;
      remainingDaily: number;
    }
  | {
      ok: false;
      status: 400 | 409 | 429 | 503;
      code: "validation_failed" | "rate_limited" | "batch_expired" | "community_unavailable";
      error: string;
      remainingDaily?: number;
    };

export interface SubmitPublicNoteDeps {
  repository?: NotesRepository;
  rateLimiter?: RateLimiter;
  moderator?: NoteModerator;
  now?: Date;
}

export async function submitPublicNote(
  rawBody: unknown,
  visitor: string,
  deps?: SubmitPublicNoteDeps,
): Promise<SubmitPublicNoteResult> {
  // Layer 1: Honeypot check (0ms, Rp 0 — silently accept without calling Gemini/DB)
  if (
    rawBody &&
    typeof rawBody === "object" &&
    "website" in rawBody &&
    typeof (rawBody as { website?: unknown }).website === "string" &&
    (rawBody as { website: string }).website.trim().length > 0
  ) {
    return {
      ok: true,
      status: 201,
      honeypotTriggered: true,
    };
  }

  // Layer 2: Strict Zod validation + automatic URL blocking
  const parsed = CreatePublicNoteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "validation_failed",
      error: "Please enter a valid name and note message.",
    };
  }

  const { requestId, submittedAt, authorName, message, mood, colorChoice, template } = parsed.data;
  if (containsUrlLikePattern(authorName) || containsUrlLikePattern(message)) {
    return {
      ok: false,
      status: 400,
      code: "contains_url",
      error: "Links and URLs are not allowed in notes.",
    };
  }

  if (sensitivePattern.test(authorName) || sensitivePattern.test(message)) {
    return {
      ok: false, status: 422, code: "moderation_rejected",
      error: "This note appears to include contact information.",
    };
  }

  const now = deps?.now ?? new Date();
  if (submittedAt < now.getTime() - MS_PER_DAY || submittedAt > now.getTime() + 5 * 60_000) {
    return { ok: false, status: 409, code: "submission_unavailable", error: "Submission expired." };
  }
  const repository = deps?.repository ?? getNotesRepository();
  const submissionId = createHash("sha256").update(visitor + ":" + requestId + ":" + submittedAt).digest("hex");
  const existing = await repository.findSubmission(submissionId);
  if (existing) return existing.note
    ? { ok: true, status: 201, note: existing.note, replayed: true }
    : { ok: false, status: 409, code: "submission_unavailable", error: "This note is no longer public." };

  if (!deps?.moderator && !isNoteModerationConfigured()) {
    return {
      ok: false, status: 503, code: "moderation_unavailable",
      error: "Busy right now. Please try posting again later.",
    };
  }

  const rateLimiter = deps?.rateLimiter ?? getRateLimiter();
  const rateCheck = await rateLimiter.reserveNoteAttempt(visitor, now);
  if (rateCheck !== "allowed") {
    return rateCheck === "visitor" ? {
      ok: false, status: 429, code: "rate_limited",
      error: "You have posted several notes recently. Please try again later.",
    } : {
      ok: false, status: 503, code: "moderation_unavailable",
      error: "Busy right now. Please try posting again later.",
    };
  }

  // Layer 4: Gemini Flash content moderation (Fail-Closed on error/timeout)
  const moderator = deps?.moderator ?? createDefaultNoteModerator();
  let moderation;
  try {
    moderation = await moderator.moderate({ authorName, message });
  } catch {
    return {
      ok: false,
      status: 503,
      code: "moderation_unavailable",
      error: "Busy right now. Please try posting again in a moment.",
    };
  }

  if (!moderation.isSafe || moderation.category !== "clean") {
    return {
      ok: false,
      status: 422,
      code: "moderation_rejected",
      category: moderation.category,
      error:
        "This note could not be posted because it did not pass community guidelines.",
    };
  }

  try {
    const note = await repository.createNote({
      submissionId,
      authorName,
      message,
      mood: (mood ?? null) as StickyNoteMood | null,
      color: resolveStickyNoteColor(colorChoice),
      template,
    });
    return { ok: true, status: 201, note };
  } catch (error) {
    if (error instanceof NoteConflictError) {
      return { ok: false, status: 409, code: "submission_unavailable", error: error.message };
    }
    throw error;
  }
}

export interface SubmitSiteLoveDeps {
  repository?: NotesRepository;
  now?: Date;
}

export async function submitSiteLove(
  rawBody: unknown,
  visitor: string,
  deps?: SubmitSiteLoveDeps,
): Promise<SubmitSiteLoveResult> {
  const parsed = IncrementLoveSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "validation_failed",
      error: "Invalid love delta.",
    };
  }

  const now = deps?.now ?? new Date();
  const { day } = parsed.data;
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - MS_PER_DAY).toISOString().slice(0, 10);
  if (day !== today && day !== yesterday) {
    return { ok: false, status: 409, code: "batch_expired", error: "Batch expired." };
  }

  const repository = deps?.repository ?? getNotesRepository();
  const result = await repository.commitLoveBatch({ ...parsed.data, visitor, now });
  if (result.unavailable) {
    return { ok: false, status: 503, code: "community_unavailable", error: "Love is temporarily unavailable." };
  }
  if (result.acceptedDelta === 0) {
    if (day !== today) return { ok: false, status: 409, code: "batch_expired", error: "Batch expired." };
    return { ok: false, status: 429, code: "rate_limited", error: "Daily love limit reached.", remainingDaily: 0 };
  }
  return { ok: true, status: 200, acceptedDelta: result.acceptedDelta, remainingDaily: result.remainingDaily };
}
