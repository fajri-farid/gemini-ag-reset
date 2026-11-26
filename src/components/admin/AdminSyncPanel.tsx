"use client";

import { useId, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Play,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  dateInputValueToUtcIso,
  isoToDateInputValue,
  type AdminSyncResponse,
} from "@/lib/admin-api";
import { formatTimestamp } from "@/lib/datetime";
import { buildCanonicalTweetUrl } from "@/lib/tweet-url";
import type { SyncStatus } from "@/lib/types";

interface AdminSyncPanelProps {
  syncStatus: SyncStatus;
  onUpdateTrackingStart: (trackingStartedAtIso: string) => Promise<void>;
  onTriggerSync: (dryRun: boolean) => Promise<AdminSyncResponse>;
  isSyncing: boolean;
  syncingMode: "live" | "dry_run" | null;
  lastSyncResult: AdminSyncResponse | null;
}

interface TrackingStartFormProps {
  initialIso: string;
  onSave: (iso: string) => Promise<void>;
}

function TrackingStartForm({ initialIso, onSave }: TrackingStartFormProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const [dateValue, setDateValue] = useState(() =>
    isoToDateInputValue(initialIso),
  );
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const parsedIso = dateInputValueToUtcIso(dateValue);
  const showClientError = (touched || submitted) && !parsedIso;
  const activeError =
    serverError ??
    (showClientError
      ? "Enter a valid calendar date in YYYY-MM-DD format."
      : null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (!parsedIso) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(parsedIso);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Failed to update tracking start date.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 flex flex-col gap-3 border-t border-ink/15 pt-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label
          htmlFor={inputId}
          className="block font-mono text-xs font-bold uppercase tracking-wider text-ink"
        >
          Heatmap Tracking Start Date (UTC)
        </label>
        <p id={hintId} className="mt-0.5 text-xs text-ink-muted">
          Format: YYYY-MM-DD (used as the Dynamic Start bound on the public
          heatmap).
        </p>
        <input
          id={inputId}
          type="date"
          required
          value={dateValue}
          onChange={(event) => {
            setDateValue(event.target.value);
            setServerError(null);
          }}
          onBlur={() => setTouched(true)}
          aria-invalid={activeError ? "true" : "false"}
          aria-describedby={activeError ? `${hintId} ${errorId}` : hintId}
          className="admin-input mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 font-mono text-sm text-ink"
        />
        {activeError && (
          <p
            id={errorId}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{activeError}</span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="neo-interactive inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-surface px-4 font-mono text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-60"
      >
        <Save className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{isSaving ? "Saving..." : "Update Start Date"}</span>
      </button>
    </form>
  );
}

export function AdminSyncPanel({
  syncStatus,
  onUpdateTrackingStart,
  onTriggerSync,
  isSyncing,
  syncingMode,
  lastSyncResult,
}: AdminSyncPanelProps) {
  const isError = syncStatus.lastStatus === "error";

  return (
    <section aria-labelledby="admin-sync-heading" className="neo-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2
            id="admin-sync-heading"
            className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
          >
            Pipeline & Sync Controls
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Trigger SocialData + Gemini Flash classification manually or run a
            non-destructive Dry-Run test.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => void onTriggerSync(true)}
            className="neo-interactive inline-flex items-center gap-2 bg-surface px-4 py-2 font-mono text-xs font-bold text-ink hover:bg-gemini-tint disabled:opacity-60"
          >
            {isSyncing && syncingMode === "dry_run" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5 text-gemini-violet" aria-hidden="true" />
            )}
            <span>
              {isSyncing && syncingMode === "dry_run"
                ? "Running Dry-Run..."
                : "Run Dry-Run Test"}
            </span>
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => void onTriggerSync(false)}
            className="neo-interactive inline-flex items-center gap-2 bg-gemini-blue px-4 py-2 font-mono text-xs font-bold text-white hover:bg-gemini-blue-hover disabled:opacity-60"
          >
            {isSyncing && syncingMode === "live" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isSyncing && syncingMode === "live"
                ? "Running Live Sync..."
                : "Run Live Sync"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border-2 border-ink bg-canvas p-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Last Sync Status
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-ink px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                isError
                  ? "bg-danger text-white"
                  : "bg-reset-live text-ink"
              }`}
            >
              {isError ? (
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{syncStatus.lastStatus}</span>
            </span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-ink bg-canvas p-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Last Checked
          </p>
          <p className="mt-1.5 font-mono text-xs font-semibold text-ink">
            {syncStatus.lastCheckedAt
              ? formatTimestamp(syncStatus.lastCheckedAt, "en", "UTC")
              : "Never checked"}
          </p>
        </div>

        <div className="rounded-lg border-2 border-ink bg-canvas p-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Last Seen Tweet ID
          </p>
          <p className="mt-1.5 truncate font-mono text-xs font-semibold text-ink">
            {syncStatus.lastSeenTweetId ?? "None"}
          </p>
        </div>
      </div>

      {syncStatus.lastErrorMessage && (
        <div
          role="status"
          className="mt-3 rounded-lg border-2 border-danger bg-red-50 px-3.5 py-2.5 text-xs text-danger"
        >
          <span className="font-mono font-bold uppercase">Last Error: </span>
          <span>{syncStatus.lastErrorMessage}</span>
        </div>
      )}

      <TrackingStartForm
        key={syncStatus.trackingStartedAt}
        initialIso={syncStatus.trackingStartedAt}
        onSave={onUpdateTrackingStart}
      />

      {lastSyncResult && (
        <div
          aria-live="polite"
          className="mt-5 rounded-xl border-2 border-ink bg-gemini-tint p-4 shadow-[3px_3px_0px_#111111]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border-[1.5px] border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                  lastSyncResult.dryRun
                    ? "bg-gemini-violet text-white"
                    : "bg-gemini-blue text-white"
                }`}
              >
                {lastSyncResult.dryRun ? "DRY-RUN TEST" : "LIVE SYNC"}
              </span>
              <span
                className={`rounded-md border-[1.5px] border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                  lastSyncResult.log.status === "ok"
                    ? "bg-reset-live text-ink"
                    : "bg-danger text-white"
                }`}
              >
                {lastSyncResult.log.status}
              </span>
              {lastSyncResult.log.errorStage !== "none" && (
                <span className="rounded-md border-[1.5px] border-ink bg-surface px-2 py-0.5 font-mono text-[11px] font-bold text-danger">
                  stage: {lastSyncResult.log.errorStage}
                </span>
              )}
            </div>

            <p className="font-mono text-xs text-ink-muted">
              Fetched {lastSyncResult.log.fetchedCount} · Saved{" "}
              {lastSyncResult.log.savedCount} · Skipped{" "}
              {lastSyncResult.log.skippedCount} ·{" "}
              {lastSyncResult.log.durationMs}ms
            </p>
          </div>

          {lastSyncResult.log.errorMessage && (
            <p className="mt-2 rounded-lg border border-danger/40 bg-surface px-3 py-2 font-mono text-xs text-danger">
              {lastSyncResult.log.errorMessage}
            </p>
          )}

          {lastSyncResult.log.evaluatedTweets.length === 0 ? (
            <p className="mt-3 text-xs text-ink-muted">
              No new tweets evaluated in this run.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {lastSyncResult.log.evaluatedTweets.map((tweet) => (
                <li
                  key={tweet.tweetId}
                  className="rounded-lg border-2 border-ink bg-surface p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={buildCanonicalTweetUrl(tweet.tweetId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-gemini-blue hover:text-gemini-violet"
                    >
                      tweet/{tweet.tweetId}
                    </a>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
                      <span
                        className={`rounded border border-ink px-1.5 py-0.5 ${
                          tweet.isReset
                            ? "bg-reset-live text-ink"
                            : "bg-surface-muted text-ink-muted"
                        }`}
                      >
                        is_reset: {String(tweet.isReset)}
                      </span>
                      <span className="rounded border border-ink bg-surface px-1.5 py-0.5 text-ink">
                        confidence: {tweet.confidence.toFixed(2)} (
                        {Math.round(tweet.confidence * 100)}%)
                      </span>
                      <span
                        className={`rounded border border-ink px-1.5 py-0.5 ${
                          tweet.saved
                            ? "bg-gemini-blue text-white"
                            : "bg-surface-muted text-ink-muted"
                        }`}
                      >
                        {tweet.saved
                          ? "SAVED"
                          : lastSyncResult.dryRun &&
                              tweet.isReset &&
                              tweet.confidence >= 0.85
                            ? "WOULD SAVE"
                            : "SKIPPED"}
                      </span>
                    </div>
                  </div>
                  {tweet.summary && (
                    <p className="mt-1.5 text-xs font-semibold text-gemini-blue">
                      {tweet.summary}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-muted">
                    {tweet.textPreview}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
