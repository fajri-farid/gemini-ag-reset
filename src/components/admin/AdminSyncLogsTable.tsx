"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Eye, X } from "lucide-react";
import { formatDurationMs, formatTimestamp } from "@/lib/datetime";
import { buildCanonicalTweetUrl } from "@/lib/tweet-url";
import type { SyncLog } from "@/lib/types";

interface AdminSyncLogsTableProps {
  logs: SyncLog[];
}

export function AdminSyncLogsTable({ logs }: AdminSyncLogsTableProps) {
  const [filter, setFilter] = useState<"all" | "error">("all");
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const detailsDialogRef = useRef<HTMLDialogElement>(null);

  const errorCount = logs.filter((log) => log.status === "error").length;
  const visibleLogs =
    filter === "error" ? logs.filter((log) => log.status === "error") : logs;

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (selectedLog && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [selectedLog]);

  const handleDialogClose = (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => {
    event.currentTarget.returnValue = "";
    setSelectedLog(null);
  };

  return (
    <section
      aria-labelledby="admin-logs-heading"
      className="neo-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="admin-logs-heading"
            className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
          >
            Recent Sync Logs (Max 50)
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Inspection trail across cron runs, manual live syncs, dry-runs, and
            error stages.
          </p>
        </div>

        <div
          className="inline-flex w-fit overflow-hidden rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#111111]"
          role="group"
          aria-label="Filter sync logs"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              filter === "all"
                ? "bg-gemini-blue text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            All ({logs.length})
          </button>
          <button
            type="button"
            aria-pressed={filter === "error"}
            onClick={() => setFilter("error")}
            className={`border-l-2 border-ink px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              filter === "error"
                ? "bg-danger text-white"
                : "bg-surface text-ink hover:bg-red-50"
            }`}
          >
            Error Only ({errorCount})
          </button>
        </div>
      </div>

      {visibleLogs.length === 0 ? (
        <div className="mt-5 rounded-xl border-2 border-dashed border-ink/25 bg-surface-muted/40 p-6 text-center text-sm text-ink-muted">
          {filter === "error"
            ? "No error logs recorded."
            : "No sync runs logged yet."}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border-2 border-ink">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink bg-canvas font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="px-3 py-2.5">Ran At (UTC)</th>
                <th className="px-3 py-2.5">Trigger</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Error Stage</th>
                <th className="px-3 py-2.5">Fetched / Saved / Skipped</th>
                <th className="px-3 py-2.5">Duration</th>
                <th className="px-3 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => {
                const hasDetails =
                  Boolean(log.errorMessage) || log.evaluatedTweets.length > 0;

                return (
                  <tr
                    key={log.id}
                    className="border-b border-ink/15 align-middle last:border-b-0"
                  >
                    <td className="px-3 py-3 font-mono text-xs text-ink whitespace-nowrap">
                      {formatTimestamp(log.ranAt, "en", "UTC")}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-bold text-ink whitespace-nowrap">
                      {log.trigger}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded border border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                          log.status === "ok"
                            ? "bg-reset-live text-ink"
                            : "bg-danger text-white"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                      <span
                        className={
                          log.errorStage === "none"
                            ? "text-ink-muted"
                            : "font-bold text-danger"
                        }
                      >
                        {log.errorStage}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-ink whitespace-nowrap">
                      {log.fetchedCount} / {log.savedCount} /{" "}
                      {log.skippedCount}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {formatDurationMs(log.durationMs)}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {hasDetails ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-2.5 py-1 font-mono text-[11px] font-bold text-ink shadow-[2px_2px_0px_#111111] transition-colors hover:bg-gemini-tint"
                        >
                          <Eye className="h-3.5 w-3.5 text-gemini-blue" aria-hidden="true" />
                          <span>
                            {log.evaluatedTweets.length > 0
                              ? `${log.evaluatedTweets.length} tweet(s)`
                              : "View Error"}
                          </span>
                        </button>
                      ) : (
                        <span className="font-mono text-[11px] text-ink-muted">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <dialog
        ref={detailsDialogRef}
        aria-labelledby="sync-log-details-dialog-title"
        onClose={handleDialogClose}
        {...({ closedby: "any" } as Record<string, string>)}
        className="m-auto w-[min(94vw,48rem)] max-h-[85vh] overflow-hidden rounded-xl border-2 border-ink bg-surface p-0 text-ink shadow-[5px_5px_0px_#111111]"
      >
        {selectedLog && (
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink bg-canvas px-5 py-4 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border-[1.5px] border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                      selectedLog.status === "ok"
                        ? "bg-reset-live text-ink"
                        : "bg-danger text-white"
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                  <span className="rounded border-[1.5px] border-ink bg-surface px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                    {selectedLog.trigger}
                  </span>
                  {selectedLog.errorStage !== "none" && (
                    <span className="rounded border-[1.5px] border-ink bg-red-50 px-2 py-0.5 font-mono text-[11px] font-bold text-danger">
                      stage: {selectedLog.errorStage}
                    </span>
                  )}
                </div>

                <h1
                  id="sync-log-details-dialog-title"
                  className="mt-2 text-lg font-extrabold tracking-tight text-ink sm:text-xl"
                >
                  Sync Log Details
                </h1>

                <p className="mt-1 font-mono text-xs text-ink-muted">
                  {formatTimestamp(selectedLog.ranAt, "en", "UTC")} · Duration:{" "}
                  <strong className="text-ink">
                    {formatDurationMs(selectedLog.durationMs)}
                  </strong>{" "}
                  · Fetched {selectedLog.fetchedCount} / Saved{" "}
                  {selectedLog.savedCount} / Skipped {selectedLog.skippedCount}
                </p>
              </div>

              <form method="dialog">
                <button
                  type="submit"
                  value="close"
                  autoFocus
                  aria-label="Close sync log details"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-surface text-ink shadow-[2px_2px_0px_#111111] transition-colors hover:bg-surface-muted"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              {selectedLog.errorMessage && (
                <div className="rounded-lg border-2 border-danger bg-red-50 p-3.5 font-mono text-xs text-danger">
                  <p className="font-bold uppercase">Sanitized Error Message</p>
                  <p className="mt-1 break-words">{selectedLog.errorMessage}</p>
                </div>
              )}

              {selectedLog.evaluatedTweets.length === 0 ? (
                <p className="rounded-lg border-2 border-dashed border-ink/25 bg-surface-muted/40 p-5 text-center text-sm text-ink-muted">
                  No tweets were evaluated during this run.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Evaluated Tweets ({selectedLog.evaluatedTweets.length})
                  </p>
                  <ul className="space-y-3">
                    {selectedLog.evaluatedTweets.map((tweet) => (
                      <li
                        key={`${selectedLog.id}-${tweet.tweetId}`}
                        className="rounded-xl border-2 border-ink bg-canvas p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={buildCanonicalTweetUrl(tweet.tweetId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-gemini-blue hover:text-gemini-blue-hover"
                          >
                            <span>tweet/{tweet.tweetId}</span>
                            <ArrowUpRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </a>

                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
                            <span
                              className={`rounded border border-ink px-2 py-0.5 ${
                                tweet.isReset
                                  ? "bg-reset-live text-ink"
                                  : "bg-surface-muted text-ink-muted"
                              }`}
                            >
                              is_reset: {String(tweet.isReset)}
                            </span>
                            <span className="rounded border border-ink bg-surface px-2 py-0.5 text-ink">
                              confidence: {tweet.confidence.toFixed(2)} (
                              {Math.round(tweet.confidence * 100)}%)
                            </span>
                            <span
                              className={`rounded border border-ink px-2 py-0.5 ${
                                tweet.saved
                                  ? "bg-gemini-blue text-white"
                                  : "bg-surface-muted text-ink-muted"
                              }`}
                            >
                              {tweet.saved
                                ? "SAVED"
                                : selectedLog.trigger === "admin_dry_run" &&
                                    tweet.isReset &&
                                    tweet.confidence >= 0.85
                                  ? "WOULD SAVE"
                                  : "SKIPPED"}
                            </span>
                          </div>
                        </div>

                        {tweet.summary && (
                          <p className="mt-2 text-xs font-semibold text-gemini-blue">
                            {tweet.summary}
                          </p>
                        )}
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">
                          {tweet.textPreview}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t-2 border-ink bg-canvas px-5 py-3 sm:px-6">
              <form method="dialog">
                <button
                  type="submit"
                  value="close"
                  className="neo-interactive bg-surface px-4 py-1.5 font-mono text-xs font-bold text-ink hover:bg-surface-muted"
                >
                  Close
                </button>
              </form>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
