import "server-only";
import crypto from "node:crypto";
import { FieldPath, FieldValue, type Firestore, type Query } from "firebase-admin/firestore";
import {
  DEFAULT_UNPINNED_ORDER,
  NOTES_PAGE_SIZE,
  MAX_DAILY_SITE_LOVES,
  MAX_PINNED_NOTES,
  STICKY_NOTE_COLORS,
  STICKY_NOTE_MOODS,
  STICKY_NOTE_TEMPLATES,
  type NotesCursor,
  type PublicNotesPage,
  type SiteStats,
  type StickyNote,
  type StickyNoteColor,
  type StickyNoteMood,
  type StickyNoteStatus,
  type StickyNoteTemplate,
} from "@/lib/sticky-notes";
import { getAdminFirestore, isFirebaseAdminConfigured } from "./firebase-admin";
import { RATE_LIMITS_COLLECTION, retentionDate } from "./rate-limit";

const DAILY_LOVE_BATCH_LIMIT = 2_000;

export class NoteConflictError extends Error {}

interface LoveBatch {
  visitor: string;
  batchId: string;
  day: string;
  delta: number;
  now: Date;
}

interface LoveBatchResult {
  acceptedDelta: number;
  remainingDaily: number;
  unavailable?: boolean;
}

interface NotesListPage {
  items: StickyNote[];
  nextCursor: NotesCursor | null;
}

function finishPage(notes: StickyNote[], limit: number): NotesListPage {
  const items = notes.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: notes.length > limit && last ? buildCursor(last) : null,
  };
}

function ensurePinnedOrder(notes: StickyNote[], orderedIds: readonly string[], expectedOrder: readonly string[]) {
  const ids = new Set(orderedIds);
  if (ids.size !== orderedIds.length || ids.size !== notes.length ||
      notes.length !== expectedOrder.length ||
      notes.toSorted(compareNoteOrder).some((note, index) => !ids.has(note.id) || note.id !== expectedOrder[index])) {
    throw new NoteConflictError("The pinned list changed. Refresh and try again.");
  }
}

function nextPinnedOrder(notes: StickyNote[]) {
  if (notes.length >= MAX_PINNED_NOTES) {
    throw new NoteConflictError("Unpin a note before pinning another.");
  }
  return Math.max(0, ...notes.map((note) => note.pinOrder)) + 1;
}

export const NOTES_COLLECTIONS = {
  notes: "notes",
  siteStats: "site_stats",
} as const;

export const SITE_STATS_DOC_ID = "main";

export interface CreateNoteRecordInput {
  authorName: string;
  message: string;
  mood: StickyNoteMood | null;
  color: StickyNoteColor;
  template: StickyNoteTemplate;
  submissionId?: string;
}

export interface UpdateNoteAdminPatch {
  isPinned?: boolean;
  lovedByMaker?: boolean;
  status?: StickyNoteStatus;
}

export interface ListPublishedNotesOptions {
  limit?: number;
  cursor?: NotesCursor | null;
  mood?: StickyNoteMood | null;
  lovedOnly?: boolean;
}

export interface NotesRepository {
  getSiteStats(): Promise<SiteStats>;
  commitLoveBatch(input: LoveBatch): Promise<LoveBatchResult>;
  findSubmission(id: string): Promise<{ note: StickyNote | null } | null>;
  listPublishedNotes(
    options?: ListPublishedNotesOptions,
    totalCount?: number,
  ): Promise<PublicNotesPage>;
  listNotesAdmin(options?: ListPublishedNotesOptions): Promise<NotesListPage>;
  createNote(input: CreateNoteRecordInput): Promise<StickyNote>;
  updateNoteAdmin(
    noteId: string,
    patch: UpdateNoteAdminPatch,
  ): Promise<StickyNote | null>;
  reorderPinnedNotes(orderedIds: readonly string[], expectedOrder: readonly string[]): Promise<StickyNote[]>;
  deleteNoteAdmin(noteId: string): Promise<boolean>;
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return fallback;
}

function parseColor(value: unknown): StickyNoteColor {
  if (
    typeof value === "string" &&
    (STICKY_NOTE_COLORS as readonly string[]).includes(value)
  ) {
    return value as StickyNoteColor;
  }
  return "butter";
}

function parseTemplate(value: unknown): StickyNoteTemplate {
  if (
    typeof value === "string" &&
    (STICKY_NOTE_TEMPLATES as readonly string[]).includes(value)
  ) {
    return value as StickyNoteTemplate;
  }
  return "classic-tape";
}

function parseMood(value: unknown): StickyNoteMood | null {
  if (
    typeof value === "string" &&
    (STICKY_NOTE_MOODS as readonly string[]).includes(value)
  ) {
    return value as StickyNoteMood;
  }
  return null;
}

function parseStatus(value: unknown): StickyNoteStatus {
  return value === "hidden" ? "hidden" : "published";
}

function mapDocToStickyNote(
  docId: string,
  data: Record<string, unknown>,
): StickyNote {
  const nowIso = new Date().toISOString();
  const isPinned = Boolean(data.isPinned);
  const rawPinOrder =
    typeof data.pinOrder === "number" && Number.isFinite(data.pinOrder)
      ? data.pinOrder
      : DEFAULT_UNPINNED_ORDER;

  return {
    id: docId,
    authorName:
      typeof data.authorName === "string" ? data.authorName : "Anonymous",
    message: typeof data.message === "string" ? data.message : "",
    mood: parseMood(data.mood),
    color: parseColor(data.color),
    template: parseTemplate(data.template),
    isPinned,
    pinOrder: isPinned ? rawPinOrder : DEFAULT_UNPINNED_ORDER,
    lovedByMaker: Boolean(data.lovedByMaker),
    status: parseStatus(data.status),
    createdAt: toIsoString(data.createdAt, nowIso),
    updatedAt: toIsoString(data.updatedAt, nowIso),
  };
}

function createNoteId(now: Date = new Date()): string {
  return `${now.getTime()}-${crypto.randomBytes(4).toString("hex")}`;
}

function buildCursor(note: StickyNote): NotesCursor {
  return {
    id: note.id,
    isPinned: note.isPinned,
    pinOrder: note.pinOrder,
    createdAt: note.createdAt,
  };
}

function clampPageSize(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return NOTES_PAGE_SIZE;
  }
  return Math.max(1, Math.min(50, Math.floor(limit)));
}

function compareNoteOrder(a: StickyNote, b: StickyNote): number {
  if (a.isPinned !== b.isPinned) {
    return a.isPinned ? -1 : 1;
  }
  if (a.pinOrder !== b.pinOrder) {
    return a.pinOrder - b.pinOrder;
  }
  if (a.createdAt !== b.createdAt) {
    return b.createdAt.localeCompare(a.createdAt);
  }
  return a.id < b.id ? -1 : Number(a.id > b.id);
}

function isAfterCursor(note: StickyNote, cursor: NotesCursor): boolean {
  const pseudo: StickyNote = {
    id: cursor.id,
    authorName: "",
    message: "",
    mood: null,
    color: "butter",
    template: "classic-tape",
    isPinned: cursor.isPinned,
    pinOrder: cursor.pinOrder,
    lovedByMaker: false,
    createdAt: cursor.createdAt,
  };
  return compareNoteOrder(note, pseudo) > 0;
}

export class InMemoryNotesRepository implements NotesRepository {
  private readonly notes = new Map<string, StickyNote>();
  private loveCount = 0;
  private loveDay = "";
  private loveBatches = 0;
  private readonly loveReceipts = new Map<string, { used: number; batches: Record<string, number> }>();
  private readonly noteReceipts = new Set<string>();
  private updatedAt = new Date().toISOString();

  constructor(initial?: { notes?: readonly StickyNote[]; loveCount?: number }) {
    if (initial?.notes) {
      for (const note of initial.notes) {
        this.notes.set(note.id, { ...note });
      }
    }
    if (typeof initial?.loveCount === "number") {
      this.loveCount = Math.max(0, initial.loveCount);
    }
  }

  private countPublished(): number {
    let count = 0;
    for (const note of this.notes.values()) {
      if ((note.status ?? "published") === "published") {
        count += 1;
      }
    }
    return count;
  }

  async getSiteStats(): Promise<SiteStats> {
    return {
      loveCount: this.loveCount,
      publishedNotesCount: this.countPublished(),
      updatedAt: this.updatedAt,
    };
  }

  async commitLoveBatch({ visitor, batchId, day, delta, now }: LoveBatch): Promise<LoveBatchResult> {
    const today = now.toISOString().slice(0, 10);
    if (this.loveDay !== today) {
      const previousDay = this.loveDay;
      for (const key of this.loveReceipts.keys()) {
        if (!key.startsWith(previousDay + "_")) this.loveReceipts.delete(key);
      }
      this.loveDay = today;
      this.loveBatches = 0;
    }
    const key = day + "_" + visitor;
    const receipt = this.loveReceipts.get(key) ?? { used: 0, batches: {} };
    const remaining = MAX_DAILY_SITE_LOVES - receipt.used;
    const saved = receipt.batches[batchId];
    if (saved !== undefined) return { acceptedDelta: saved, remainingDaily: remaining };
    if (day !== today || remaining === 0) return { acceptedDelta: 0, remainingDaily: remaining };
    if (this.loveBatches >= DAILY_LOVE_BATCH_LIMIT) {
      return { acceptedDelta: 0, remainingDaily: remaining, unavailable: true };
    }
    const acceptedDelta = Math.min(remaining, delta);
    receipt.batches[batchId] = acceptedDelta;
    receipt.used += acceptedDelta;
    this.loveReceipts.set(key, receipt);
    this.loveCount += acceptedDelta;
    this.loveBatches += 1;
    this.updatedAt = now.toISOString();
    return { acceptedDelta, remainingDaily: remaining - acceptedDelta };
  }

  async findSubmission(id: string): Promise<{ note: StickyNote | null } | null> {
    if (!this.noteReceipts.has(id)) return null;
    const note = this.notes.get(id);
    return { note: note?.status === "published" ? note : null };
  }

  async listPublishedNotes(
    options?: ListPublishedNotesOptions,
  ): Promise<PublicNotesPage> {
    const limit = clampPageSize(options?.limit);
    const allPublished = Array.from(this.notes.values())
      .filter((note) => (note.status ?? "published") === "published")
      .sort(compareNoteOrder);

    const filtered = allPublished.filter((note) => {
      if (options?.lovedOnly && !note.lovedByMaker) {
        return false;
      }
      if (options?.mood && note.mood !== options.mood) {
        return false;
      }
      return true;
    });

    const afterCursor = options?.cursor
      ? filtered.filter((note) => isAfterCursor(note, options.cursor!))
      : filtered;

    const slice = afterCursor.slice(0, limit);
    const hasMore = afterCursor.length > limit;
    const last = slice.at(-1);

    return {
      items: slice,
      nextCursor: hasMore && last ? buildCursor(last) : null,
      totalCount: allPublished.length,
    };
  }

  async listNotesAdmin(options?: ListPublishedNotesOptions): Promise<NotesListPage> {
    const notes = Array.from(this.notes.values()).sort(compareNoteOrder);
    const cursor = options?.cursor;
    return finishPage(cursor ? notes.filter((note) => isAfterCursor(note, cursor)) : notes,
      clampPageSize(options?.limit));
  }

  async createNote(input: CreateNoteRecordInput): Promise<StickyNote> {
    const { submissionId } = input;
    if (submissionId && this.noteReceipts.has(submissionId)) {
      const note = this.notes.get(submissionId);
      if (note?.status !== "published") throw new NoteConflictError("This submission is no longer public.");
      return { ...note };
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const note: StickyNote = {
      id: input.submissionId ?? createNoteId(now),
      authorName: input.authorName,
      message: input.message,
      mood: input.mood,
      color: input.color,
      template: input.template,
      isPinned: false,
      pinOrder: DEFAULT_UNPINNED_ORDER,
      lovedByMaker: false,
      status: "published",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    if (input.submissionId) this.noteReceipts.add(input.submissionId);
    this.notes.set(note.id, note);
    this.updatedAt = nowIso;
    return { ...note };
  }

  async updateNoteAdmin(
    noteId: string,
    patch: UpdateNoteAdminPatch,
  ): Promise<StickyNote | null> {
    const existing = this.notes.get(noteId);
    if (!existing) {
      return null;
    }

    const nextIsPinned = patch.isPinned ?? existing.isPinned;
    let nextPinOrder = existing.pinOrder;
    if (nextIsPinned && nextPinOrder >= DEFAULT_UNPINNED_ORDER) {
      nextPinOrder = nextPinnedOrder(Array.from(this.notes.values()).filter(
        (item) => item.isPinned && item.id !== noteId,
      ));
    } else if (!nextIsPinned) {
      nextPinOrder = DEFAULT_UNPINNED_ORDER;
    }

    const updated: StickyNote = {
      ...existing,
      isPinned: nextIsPinned,
      pinOrder: nextPinOrder,
      lovedByMaker: patch.lovedByMaker ?? existing.lovedByMaker,
      status: patch.status ?? existing.status ?? "published",
      updatedAt: new Date().toISOString(),
    };
    this.notes.set(noteId, updated);
    this.updatedAt = updated.updatedAt ?? this.updatedAt;
    return { ...updated };
  }

  async reorderPinnedNotes(
    orderedIds: readonly string[],
    expectedOrder: readonly string[],
  ): Promise<StickyNote[]> {
    const pinned = Array.from(this.notes.values()).filter((note) => note.isPinned);
    ensurePinnedOrder(pinned, orderedIds, expectedOrder);
    const byId = new Map(pinned.map((note) => [note.id, note]));
    const nowIso = new Date().toISOString();
    return orderedIds.map((id, index) => {
      const note = byId.get(id)!;
      if (note.pinOrder === index + 1) return { ...note };
      const updated = { ...note, pinOrder: index + 1, updatedAt: nowIso };
      this.notes.set(id, updated);
      return { ...updated };
    });
  }

  async deleteNoteAdmin(noteId: string): Promise<boolean> {
    const deleted = this.notes.delete(noteId);
    if (deleted) {
      this.updatedAt = new Date().toISOString();
    }
    return deleted;
  }
}

export class FirestoreNotesRepository implements NotesRepository {
  constructor(private readonly db: Firestore) {}

  private get notesCollection() {
    return this.db.collection(NOTES_COLLECTIONS.notes);
  }

  private get statsDoc() {
    return this.db
      .collection(NOTES_COLLECTIONS.siteStats)
      .doc(SITE_STATS_DOC_ID);
  }

  async getSiteStats(): Promise<SiteStats> {
    const snap = await this.statsDoc.get();
    const nowIso = new Date().toISOString();
    if (!snap.exists) {
      return { loveCount: 0, publishedNotesCount: 0, updatedAt: nowIso };
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    return {
      loveCount:
        typeof data.loveCount === "number" && Number.isFinite(data.loveCount)
          ? Math.max(0, Math.floor(data.loveCount))
          : 0,
      publishedNotesCount:
        typeof data.publishedNotesCount === "number" &&
        Number.isFinite(data.publishedNotesCount)
          ? Math.max(0, Math.floor(data.publishedNotesCount))
          : 0,
      updatedAt: toIsoString(data.updatedAt, nowIso),
    };
  }

  async commitLoveBatch({ visitor, batchId, day, delta, now }: LoveBatch): Promise<LoveBatchResult> {
    const today = now.toISOString().slice(0, 10);
    const receiptRef = this.db.collection(RATE_LIMITS_COLLECTION).doc("love_" + visitor + "_" + day);
    return this.db.runTransaction(async (tx) => {
      const receipt = await tx.get(receiptRef);
      const used: number = receipt.get("count") ?? 0;
      const batches: Record<string, number> = receipt.get("batches") ?? {};
      const remaining = MAX_DAILY_SITE_LOVES - used;
      const saved = batches[batchId];
      if (saved !== undefined) return { acceptedDelta: saved, remainingDaily: remaining };
      if (day !== today || remaining === 0) return { acceptedDelta: 0, remainingDaily: remaining };
      const stats = await tx.get(this.statsDoc);
      const dayBatches: number = stats.get("loveBatchDay") === today ? stats.get("loveBatches") ?? 0 : 0;
      if (dayBatches >= DAILY_LOVE_BATCH_LIMIT) {
        return { acceptedDelta: 0, remainingDaily: remaining, unavailable: true };
      }
      const acceptedDelta = Math.min(remaining, delta);
      tx.set(receiptRef, {
        count: used + acceptedDelta,
        batches: { ...batches, [batchId]: acceptedDelta },
        expiresAt: retentionDate(now),
      });
      tx.set(this.statsDoc, {
        loveCount: FieldValue.increment(acceptedDelta),
        loveBatchDay: today,
        loveBatches: dayBatches + 1,
        updatedAt: now.toISOString(),
      }, { merge: true });
      return { acceptedDelta, remainingDaily: remaining - acceptedDelta };
    });
  }

  private noteReceipt(id: string) {
    return this.db.collection(RATE_LIMITS_COLLECTION).doc("submission_" + id);
  }

  async findSubmission(id: string): Promise<{ note: StickyNote | null } | null> {
    if (!(await this.noteReceipt(id).get()).exists) return null;
    const snapshot = await this.notesCollection.doc(id).get();
    const data = snapshot.data();
    return { note: data?.status === "published" ? mapDocToStickyNote(id, data) : null };
  }

  private async readNotesPage(query: Query, options?: ListPublishedNotesOptions): Promise<NotesListPage> {
    const limit = clampPageSize(options?.limit);
    const cursor = options?.cursor;
    let ordered = query
      .orderBy("isPinned", "desc")
      .orderBy("pinOrder", "asc")
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "asc");
    if (cursor) ordered = ordered.startAfter(cursor.isPinned, cursor.pinOrder, cursor.createdAt, cursor.id);
    const snapshot = await ordered.limit(limit + 1).get();
    return finishPage(snapshot.docs.map((doc) => mapDocToStickyNote(doc.id, doc.data())), limit);
  }

  async listPublishedNotes(options?: ListPublishedNotesOptions, totalCount?: number): Promise<PublicNotesPage> {
    let query: Query = this.notesCollection.where("status", "==", "published");
    if (options?.mood) query = query.where("mood", "==", options.mood);
    if (options?.lovedOnly) query = query.where("lovedByMaker", "==", true);
    const [page, count] = await Promise.all([
      this.readNotesPage(query, options),
      totalCount ?? this.getSiteStats().then((stats) => stats.publishedNotesCount),
    ]);
    return { ...page, totalCount: count };
  }

  async listNotesAdmin(options?: ListPublishedNotesOptions): Promise<NotesListPage> {
    return this.readNotesPage(this.notesCollection, options);
  }

  async createNote(input: CreateNoteRecordInput): Promise<StickyNote> {
    const now = new Date();
    const nowIso = now.toISOString();
    const id = input.submissionId ?? createNoteId(now);
    const docRef = this.notesCollection.doc(id);

    const record = {
      authorName: input.authorName,
      message: input.message,
      mood: input.mood,
      color: input.color,
      template: input.template,
      isPinned: false,
      pinOrder: DEFAULT_UNPINNED_ORDER,
      lovedByMaker: false,
      status: "published" as const,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const batch = this.db.batch();
    batch.create(docRef, record);
    if (input.submissionId) batch.create(this.noteReceipt(id), { expiresAt: retentionDate(now) });
    batch.set(
      this.statsDoc,
      {
        publishedNotesCount: FieldValue.increment(1),
        updatedAt: nowIso,
      },
      { merge: true },
    );
    try {
      await batch.commit();
    } catch (error) {
      if (!input.submissionId || (error as { code?: number }).code !== 6) throw error;
      const existing = await this.findSubmission(id);
      if (existing?.note) return existing.note;
      throw new NoteConflictError("This submission is no longer public.");
    }

    return {
      id,
      authorName: record.authorName,
      message: record.message,
      mood: record.mood,
      color: record.color,
      template: record.template,
      isPinned: false,
      pinOrder: DEFAULT_UNPINNED_ORDER,
      lovedByMaker: false,
      status: "published",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  async updateNoteAdmin(
    noteId: string,
    patch: UpdateNoteAdminPatch,
  ): Promise<StickyNote | null> {
    const docRef = this.notesCollection.doc(noteId);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      const data = snapshot.data();
      if (!data) return null;
      const existing = mapDocToStickyNote(noteId, data);
      const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      if (patch.isPinned && !existing.isPinned) {
        const pinned = await tx.get(this.notesCollection.where("isPinned", "==", true).limit(MAX_PINNED_NOTES));
        updated.pinOrder = nextPinnedOrder(pinned.docs.map((doc) => mapDocToStickyNote(doc.id, doc.data())));
      } else if (patch.isPinned === false) {
        updated.pinOrder = DEFAULT_UNPINNED_ORDER;
      }
      const changes: UpdateNoteAdminPatch & { updatedAt: string; pinOrder?: number } = {
        ...patch,
        updatedAt: updated.updatedAt,
      };
      if (patch.isPinned !== undefined) changes.pinOrder = updated.pinOrder;
      tx.update(docRef, { ...changes });
      if (patch.status !== undefined && (data.status === "published") !== (patch.status === "published")) {
        tx.set(this.statsDoc, {
          publishedNotesCount: FieldValue.increment(updated.status === "published" ? 1 : -1),
          updatedAt: updated.updatedAt,
        }, { merge: true });
      }
      return updated;
    });
  }

  async reorderPinnedNotes(orderedIds: readonly string[], expectedOrder: readonly string[]): Promise<StickyNote[]> {
    return this.db.runTransaction(async (tx) => {
      const pinned = await tx.get(this.notesCollection.where("isPinned", "==", true).limit(MAX_PINNED_NOTES + 1));
      const notes = pinned.docs.map((doc) => mapDocToStickyNote(doc.id, doc.data()));
      ensurePinnedOrder(notes, orderedIds, expectedOrder);
      const byId = new Map(notes.map((note) => [note.id, note]));
      const now = new Date().toISOString();
      return orderedIds.map((id, index) => {
        const note = byId.get(id)!;
        const pinOrder = index + 1;
        if (note.pinOrder === pinOrder) return note;
        tx.update(this.notesCollection.doc(id), { pinOrder, updatedAt: now });
        return { ...note, pinOrder, updatedAt: now };
      });
    });
  }

  async deleteNoteAdmin(noteId: string): Promise<boolean> {
    const docRef = this.notesCollection.doc(noteId);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) return false;
      tx.delete(docRef);
      if (snapshot.get("status") === "published") {
        tx.set(this.statsDoc, {
          publishedNotesCount: FieldValue.increment(-1),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      return true;
    });
  }
}

let cachedNotesRepo: NotesRepository | null = null;

export function getNotesRepository(): NotesRepository {
  if (cachedNotesRepo) {
    return cachedNotesRepo;
  }

  if (isFirebaseAdminConfigured()) {
    cachedNotesRepo = new FirestoreNotesRepository(getAdminFirestore());
    return cachedNotesRepo;
  }

  cachedNotesRepo = new InMemoryNotesRepository();
  return cachedNotesRepo;
}
