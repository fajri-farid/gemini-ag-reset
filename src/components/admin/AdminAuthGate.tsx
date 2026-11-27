"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import {
  AlertTriangle,
  ArrowLeft,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AdminNotesManager } from "@/components/admin/AdminNotesManager";
import { AdminResetsManager } from "@/components/admin/AdminResetsManager";
import { AdminSyncLogsTable } from "@/components/admin/AdminSyncLogsTable";
import { AdminSyncPanel } from "@/components/admin/AdminSyncPanel";
import {
  AdminApiError,
  createManualReset,
  deleteAdminNote,
  deleteManualReset,
  fetchAdminDashboard,
  fetchAdminLogs,
  fetchAdminNotes,
  reorderAdminPinnedNotes,
  triggerAdminSync,
  updateAdminNote,
  updateManualReset,
  updateTrackingStartedAt,
  type AdminSyncResponse,
  type CreateManualResetInput,
  type UpdateAdminNoteInput,
  type UpdateManualResetInput,
} from "@/lib/admin-api";
import {
  createGoogleAuthProvider,
  getFirebaseClientAuth,
  getMissingFirebaseClientEnvVars,
} from "@/lib/firebase-client";
import { sortStickyNotes, type NotesCursor, type SiteStats, type StickyNote } from "@/lib/sticky-notes";
import type { ResetRecord, SyncLog, SyncStatus } from "@/lib/types";

interface FeedbackBanner {
  tone: "success" | "error";
  message: string;
}

export function AdminAuthGate() {
  const missingEnvVars = getMissingFirebaseClientEnvVars();
  const isConfigured = missingEnvVars.length === 0;

  const [authReady, setAuthReady] = useState(!isConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [accessError, setAccessError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [resets, setResets] = useState<ResetRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [notesCursor, setNotesCursor] = useState<NotesCursor | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingMode, setSyncingMode] = useState<"live" | "dry_run" | null>(
    null,
  );
  const [lastSyncResult, setLastSyncResult] =
    useState<AdminSyncResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);

  const loadAdminData = useCallback(async (currentUser: User) => {
    setIsLoadingData(true);
    setAccessError(null);

    try {
      const idToken = await currentUser.getIdToken();
      const [dashboard, logsResponse] = await Promise.all([
        fetchAdminDashboard(idToken),
        fetchAdminLogs(idToken, 50),
      ]);

      setResets(dashboard.resets);
      setSyncStatus(dashboard.syncStatus);
      setLogs(logsResponse.logs);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setAccessError({ status: err.status, message: err.message });
      } else {
        setAccessError({
          status: 500,
          message:
            err instanceof Error
              ? err.message
              : "Failed to load admin data.",
        });
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setAuthActionError(null);

      if (nextUser) {
        void loadAdminData(nextUser);
      } else {
        setAccessError(null);
        setResets([]);
        setSyncStatus(null);
        setLogs([]);
        setNotes([]);
        setNotesCursor(null);
        setNotesError(null);
        setSiteStats(null);
        setLastSyncResult(null);
      }
    });

    return () => unsubscribe();
  }, [loadAdminData]);

  const handleSignIn = async () => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      return;
    }

    setIsSigningIn(true);
    setAuthActionError(null);

    try {
      await signInWithPopup(auth, createGoogleAuthProvider());
    } catch (err) {
      setAuthActionError(
        err instanceof Error
          ? err.message
          : "Google Sign-In could not be completed.",
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      return;
    }

    setFeedback(null);
    await signOut(auth);
  };

  const withIdToken = async (): Promise<string> => {
    if (!user) {
      throw new Error("Admin session expired. Please sign in again.");
    }
    return user.getIdToken();
  };

  const handleCreateReset = async (input: CreateManualResetInput) => {
    const token = await withIdToken();
    await createManualReset(token, input);
    if (user) {
      await loadAdminData(user);
    }
    setFeedback({
      tone: "success",
      message: "Reset record saved and public cache revalidated.",
    });
  };

  const handleUpdateReset = async (
    tweetId: string,
    input: UpdateManualResetInput,
  ) => {
    const token = await withIdToken();
    await updateManualReset(token, tweetId, input);
    if (user) {
      await loadAdminData(user);
    }
    setFeedback({
      tone: "success",
      message: `Updated reset #${tweetId} and revalidated public cache.`,
    });
  };

  const handleDeleteReset = async (tweetId: string) => {
    try {
      const token = await withIdToken();
      await deleteManualReset(token, tweetId);
      if (user) {
        await loadAdminData(user);
      }
      setFeedback({
        tone: "success",
        message: `Deleted reset #${tweetId} and revalidated public cache.`,
      });
    } catch (err) {
      setFeedback({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : `Failed to delete reset #${tweetId}.`,
      });
    }
  };

  const handleUpdateTrackingStart = async (iso: string) => {
    const token = await withIdToken();
    await updateTrackingStartedAt(token, iso);
    if (user) {
      await loadAdminData(user);
    }
    setFeedback({
      tone: "success",
      message: "Heatmap tracking start date updated.",
    });
  };

  const loadNotes = async (cursor?: NotesCursor) => {
    if (isLoadingNotes) return;
    setIsLoadingNotes(true);
    setNotesError(null);
    try {
      const token = await withIdToken();
      const result = await fetchAdminNotes(token, cursor);
      setNotes((current) => cursor
        ? sortStickyNotes(Array.from(new Map([...current, ...result.notes].map((note) => [note.id, note])).values()))
        : result.notes);
      setNotesCursor(result.nextCursor);
      if (result.stats) setSiteStats(result.stats);
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Unable to load community notes.");
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const updateNotesCount = (delta: number) => {
    if (!delta) return;
    setSiteStats((stats) => stats ? {
      ...stats,
      publishedNotesCount: Math.max(0, stats.publishedNotesCount + delta),
    } : stats);
  };

  const handleUpdateNote = async (
    noteId: string,
    input: UpdateAdminNoteInput,
  ) => {
    try {
      const token = await withIdToken();
      const previous = notes.find((note) => note.id === noteId);
      const { note } = await updateAdminNote(token, noteId, input);
      setNotes((current) => sortStickyNotes(current.map((item) => item.id === note.id ? note : item)));
      if (previous) updateNotesCount(Number(note.status === "published") - Number(previous.status === "published"));
      if (notesCursor && previous?.isPinned !== note.isPinned) await loadNotes();
      setFeedback({
        tone: "success",
        message: "Updated community note and refreshed public cache.",
      });
    } catch (err) {
      setFeedback({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to update community note.",
      });
    }
  };

  const handleReorderPinnedNotes = async (
    orderedIds: readonly string[], expectedOrder: readonly string[],
  ) => {
    try {
      const token = await withIdToken();
      const result = await reorderAdminPinnedNotes(token, orderedIds, expectedOrder);
      const reordered = new Map(result.notes.map((note) => [note.id, note]));
      setNotes((current) => sortStickyNotes(current.map((note) => reordered.get(note.id) ?? note)));
      if (notesCursor?.isPinned) await loadNotes();
      setFeedback({
        tone: "success",
        message: "Pinned notes order saved and public wall revalidated.",
      });
    } catch (err) {
      setFeedback({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to save pinned notes order.",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const token = await withIdToken();
      await deleteAdminNote(token, noteId);
      if (notes.find((note) => note.id === noteId)?.status === "published") updateNotesCount(-1);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      setFeedback({
        tone: "success",
        message: "Deleted community note and refreshed public cache.",
      });
    } catch (err) {
      setFeedback({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to delete community note.",
      });
    }
  };

  const handleTriggerSync = async (
    dryRun: boolean,
  ): Promise<AdminSyncResponse> => {
    setIsSyncing(true);
    setSyncingMode(dryRun ? "dry_run" : "live");
    setFeedback(null);

    try {
      const token = await withIdToken();
      const result = await triggerAdminSync(token, dryRun);
      setLastSyncResult(result);
      if (user) {
        await loadAdminData(user);
      }
      setFeedback({
        tone: result.ok ? "success" : "error",
        message: result.ok
          ? dryRun
            ? `Dry-Run completed (${result.log.fetchedCount} tweet evaluated, DB unchanged).`
            : `Live sync completed (saved ${result.log.savedCount} reset).`
          : `Sync finished with error at stage "${result.log.errorStage}".`,
      });
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to execute sync.";
      setFeedback({ tone: "error", message });
      throw err;
    } finally {
      setIsSyncing(false);
      setSyncingMode(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-surface p-1.5 shadow-[2px_2px_0px_#111111]">
            <Image
              src="/gemini logo.webp"
              alt=""
              width={24}
              height={24}
              loading="eager"
              className="h-6 w-6 object-contain"
              aria-hidden="true"
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              Gemini Resets · Admin
            </h1>
            <p className="font-mono text-xs text-ink-muted">
              Private operations console
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-ink hover:bg-surface-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Public Tracker</span>
          </Link>

          {user && (
            <>
              <button
                type="button"
                disabled={isLoadingData}
                onClick={() => void loadAdminData(user)}
                className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-ink hover:bg-gemini-tint disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-ink hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </>
          )}
        </div>
      </header>

      {!isConfigured ? (
        <section className="neo-card p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-extrabold text-ink">
                Firebase Client Auth Not Configured
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Set the public Firebase Web App config variables in{" "}
                <code className="font-mono text-xs font-bold text-ink">
                  .env.local
                </code>{" "}
                (or Vercel Environment Variables) to enable Google Sign-In on{" "}
                <code className="font-mono text-xs font-bold text-ink">
                  /admin
                </code>
                :
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-xs text-ink">
                {missingEnvVars.map((envName) => (
                  <li key={envName}>{envName}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : !authReady ? (
        <section className="neo-card p-8 text-center">
          <RefreshCw
            className="mx-auto h-6 w-6 animate-spin text-gemini-blue"
            aria-hidden="true"
          />
          <p className="mt-3 font-mono text-xs font-bold text-ink-muted">
            Checking admin session...
          </p>
        </section>
      ) : !user ? (
        <section className="neo-card neo-dotted-grid p-8 text-center">
          <div className="mx-auto max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-3 py-1 font-mono text-xs font-bold text-ink shadow-[2px_2px_0px_#111111]">
              <ShieldCheck className="h-3.5 w-3.5 text-gemini-blue" aria-hidden="true" />
              <span>Allowlisted Google Auth</span>
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-ink">
              Sign in to manage Gemini Resets
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Only the owner account matching{" "}
              <code className="font-mono text-xs font-bold text-ink">
                ADMIN_EMAIL
              </code>{" "}
              is authorized on the server.
            </p>

            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => void handleSignIn()}
              className="neo-interactive mt-6 inline-flex items-center gap-2 bg-gemini-blue px-5 py-2.5 font-mono text-xs font-bold text-white hover:bg-gemini-blue-hover disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>
                {isSigningIn ? "Signing in..." : "Sign in with Google"}
              </span>
            </button>

            {authActionError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border-2 border-danger bg-red-50 px-3 py-2 text-xs font-medium text-danger"
              >
                {authActionError}
              </p>
            )}
          </div>
        </section>
      ) : accessError ? (
        <section className="neo-card p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-danger"
              aria-hidden="true"
            />
            <div className="flex-1">
              <h2 className="text-base font-extrabold text-ink">
                {accessError.status === 403 || accessError.status === 401
                  ? "Access Denied"
                  : "Server Verification Failed"}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Signed in as{" "}
                <span className="font-mono font-bold text-ink">
                  {user.email ?? "unknown account"}
                </span>
                . Server responded ({accessError.status}):{" "}
                {accessError.message}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void loadAdminData(user)}
                  className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3.5 py-1.5 font-mono text-xs font-bold text-ink hover:bg-gemini-tint"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="neo-interactive inline-flex items-center gap-1.5 bg-danger px-3.5 py-1.5 font-mono text-xs font-bold text-white hover:opacity-90"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Switch Google Account</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink bg-surface px-4 py-2.5 text-xs shadow-[2px_2px_0px_#111111]">
            <span className="inline-flex items-center gap-2 font-mono text-ink">
              <ShieldCheck
                className="h-4 w-4 text-reset-live"
                aria-hidden="true"
              />
              <span>
                Authenticated as{" "}
                <strong className="font-bold">{user.email}</strong>
              </span>
            </span>
            <span className="font-mono text-ink-muted">
              {resets.length} resets · {notes.length} notes · {logs.length} logs
            </span>
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-xl border-2 border-ink px-4 py-3 text-xs font-semibold shadow-[2px_2px_0px_#111111] ${
                feedback.tone === "success"
                  ? "bg-reset-live-bg text-ink"
                  : "bg-red-50 text-danger"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {syncStatus ? (
            <AdminSyncPanel
              syncStatus={syncStatus}
              onUpdateTrackingStart={handleUpdateTrackingStart}
              onTriggerSync={handleTriggerSync}
              isSyncing={isSyncing}
              syncingMode={syncingMode}
              lastSyncResult={lastSyncResult}
            />
          ) : (
            <div className="neo-card p-6 text-center font-mono text-xs text-ink-muted">
              Loading sync status...
            </div>
          )}

          <AdminResetsManager
            resets={resets}
            onCreateReset={handleCreateReset}
            onUpdateReset={handleUpdateReset}
            onDeleteReset={handleDeleteReset}
          />

          <details
            className="neo-card p-4 sm:p-6"
            onToggle={(event) => {
              if (event.currentTarget.open && !siteStats && !notesError) void loadNotes();
            }}
          >
            <summary className="cursor-pointer font-bold">Community notes</summary>
            {siteStats && (
              <div className="mt-4">
                <AdminNotesManager
                  notes={notes}
                  stats={siteStats}
                  onUpdateNote={handleUpdateNote}
                  onReorderPinned={handleReorderPinnedNotes}
                  onDeleteNote={handleDeleteNote}
                />
              </div>
            )}
            {isLoadingNotes && <p role="status" className="mt-3 text-sm">Loading notes...</p>}
            {notesError && <p role="alert" className="mt-3 text-sm text-danger">{notesError}</p>}
            {(notesCursor || notesError) && (
              <button
                type="button"
                disabled={isLoadingNotes}
                className="neo-interactive mt-3 px-3 py-2 text-sm font-semibold"
                onClick={() => void loadNotes(notesCursor ?? undefined)}
              >
                {notesError ? "Try again" : "Load more notes"}
              </button>
            )}
            {siteStats && (
              <button
                type="button"
                disabled={isLoadingNotes}
                className="neo-interactive mt-3 ml-2 px-3 py-2 text-sm font-semibold"
                onClick={() => void loadNotes()}
              >
                Refresh notes
              </button>
            )}
          </details>

          <AdminSyncLogsTable logs={logs} />
        </>
      )}
    </div>
  );
}
