import { noteCursorParams, type NotesCursor, type SiteStats, type StickyNote, type StickyNoteStatus } from "./sticky-notes";
import type { ResetRecord, SyncLog, SyncStatus } from "./types";

export interface AdminDashboardResponse {
  resets: ResetRecord[];
  syncStatus: SyncStatus;
}

export interface AdminNotesResponse {
  notes: StickyNote[];
  stats: SiteStats | null;
  nextCursor: NotesCursor | null;
}

export interface UpdateAdminNoteInput {
  isPinned?: boolean;
  lovedByMaker?: boolean;
  status?: StickyNoteStatus;
}

export interface AdminLogsResponse {
  logs: SyncLog[];
}

export interface AdminSyncResponse {
  ok: boolean;
  dryRun: boolean;
  log: SyncLog;
  savedResets: ResetRecord[];
}

export interface CreateManualResetInput {
  tweetUrlOrId: string;
  tweetText: string;
  summary: string | null;
  resetAt: string;
}

export interface UpdateManualResetInput {
  tweetText?: string;
  summary?: string | null;
  resetAt?: string;
}

export class AdminApiError extends Error {
  status: number;
  issues?: string[];

  constructor(message: string, status: number, issues?: string[]) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.issues = issues;
  }
}

export function isoToDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function datetimeLocalValueToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function isoToDateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function dateInputValueToUtcIso(dateValue: string): string | null {
  const trimmed = dateValue.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    Number.isNaN(utcDate.getTime()) ||
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return utcDate.toISOString();
}

async function requestAdminJson<T>(
  path: string,
  idToken: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | { error?: string; issues?: string[] }
    | null;

  if (!response.ok) {
    const message =
      data?.error || `Request failed with status ${response.status}.`;
    throw new AdminApiError(message, response.status, data?.issues);
  }

  return data as T;
}

export async function fetchAdminDashboard(
  idToken: string,
): Promise<AdminDashboardResponse> {
  return requestAdminJson<AdminDashboardResponse>(
    "/api/admin/resets",
    idToken,
    { method: "GET" },
  );
}

export async function fetchAdminLogs(
  idToken: string,
  limit = 50,
): Promise<AdminLogsResponse> {
  return requestAdminJson<AdminLogsResponse>(
    `/api/admin/logs?limit=${encodeURIComponent(String(limit))}`,
    idToken,
    { method: "GET" },
  );
}

export async function createManualReset(
  idToken: string,
  input: CreateManualResetInput,
): Promise<{ reset: ResetRecord }> {
  return requestAdminJson<{ reset: ResetRecord }>(
    "/api/admin/resets",
    idToken,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateManualReset(
  idToken: string,
  tweetId: string,
  input: UpdateManualResetInput,
): Promise<{ reset: ResetRecord }> {
  return requestAdminJson<{ reset: ResetRecord }>(
    `/api/admin/resets/${encodeURIComponent(tweetId)}`,
    idToken,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteManualReset(
  idToken: string,
  tweetId: string,
): Promise<{ ok: boolean; tweetId: string }> {
  return requestAdminJson<{ ok: boolean; tweetId: string }>(
    `/api/admin/resets/${encodeURIComponent(tweetId)}`,
    idToken,
    { method: "DELETE" },
  );
}

export async function updateTrackingStartedAt(
  idToken: string,
  trackingStartedAt: string,
): Promise<{ syncStatus: SyncStatus }> {
  return requestAdminJson<{ syncStatus: SyncStatus }>(
    "/api/admin/status",
    idToken,
    {
      method: "PATCH",
      body: JSON.stringify({ trackingStartedAt }),
    },
  );
}

export async function triggerAdminSync(
  idToken: string,
  dryRun: boolean,
): Promise<AdminSyncResponse> {
  return requestAdminJson<AdminSyncResponse>("/api/admin/sync", idToken, {
    method: "POST",
    body: JSON.stringify({ dryRun }),
  });
}

export async function fetchAdminNotes(
  idToken: string,
  cursor?: NotesCursor | null,
): Promise<AdminNotesResponse> {
  const path = "/api/admin/notes" + (cursor ? "?" + noteCursorParams(cursor) : "");
  return requestAdminJson<AdminNotesResponse>(path, idToken, {
    method: "GET",
  });
}

export async function updateAdminNote(
  idToken: string,
  noteId: string,
  input: UpdateAdminNoteInput,
): Promise<{ note: StickyNote }> {
  return requestAdminJson<{ note: StickyNote }>(
    `/api/admin/notes/${encodeURIComponent(noteId)}`,
    idToken,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function reorderAdminPinnedNotes(
  idToken: string,
  orderedIds: readonly string[],
  expectedOrder: readonly string[],
): Promise<{ ok: boolean; notes: StickyNote[] }> {
  return requestAdminJson<{ ok: boolean; notes: StickyNote[] }>(
    "/api/admin/notes/reorder",
    idToken,
    {
      method: "PATCH",
      body: JSON.stringify({ orderedIds, expectedOrder }),
    },
  );
}

export async function deleteAdminNote(
  idToken: string,
  noteId: string,
): Promise<{ ok: boolean; noteId: string }> {
  return requestAdminJson<{ ok: boolean; noteId: string }>(
    `/api/admin/notes/${encodeURIComponent(noteId)}`,
    idToken,
    { method: "DELETE" },
  );
}
