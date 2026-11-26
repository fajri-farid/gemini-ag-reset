"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatTimestamp } from "@/lib/datetime";
import { buildCanonicalTweetUrl } from "@/lib/tweet-url";
import type { SyncLog } from "@/lib/types";

interface AdminSyncLogsTableProps {
  logs: SyncLog[];
}

export function AdminSyncLogsTable({ logs }: AdminSyncLogsTableProps) {
  const [filter, setFilter] = useState<"all" | "error">("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const errorCount = logs.filter((log) => log.status === "error").length;
  const visibleLogs =
    filter === "error" ? logs.filter((log) => log.status === "error") : logs;

  const toggleExpand = (logId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
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
            Inspection trail across cron runs, manual live syncs, dry-runs,
            and error stages.
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
                const isExpanded = Boolean(expandedIds[log.id]);

                return (
                  <tr
                    key={log.id}
                    className="border-b border-ink/15 align-top last:border-b-0"
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
                      {log.durationMs}ms
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {hasDetails ? (
                        <div>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1 rounded border-2 border-ink bg-surface px-2 py-1 font-mono text-[11px] font-bold text-ink hover:bg-gemini-tint"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronRight
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {log.evaluatedTweets.length > 0
                                ? `${log.evaluatedTweets.length} tweet(s)`
                                : "Error"}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 rounded-lg border-2 border-ink bg-canvas p-3">
                              {log.errorMessage && (
                                <p className="font-mono text-xs text-danger">
                                  {log.errorMessage}
                                </p>
                              )}
                              {log.evaluatedTweets.map((tweet) => (
                                <div
                                  key={`${log.id}-${tweet.tweetId}`}
                                  className="rounded border border-ink/25 bg-surface p-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                                    <a
                                      href={buildCanonicalTweetUrl(
                                        tweet.tweetId,
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-bold text-gemini-blue hover:text-gemini-violet"
                                    >
                                      #{tweet.tweetId}
                                    </a>
                                    <span className="text-ink-muted">
                                      reset={String(tweet.isReset)} · conf=
                                      {tweet.confidence.toFixed(2)} · saved=
                                      {String(tweet.saved)}
                                    </span>
                                  </div>
                                  {tweet.summary && (
                                    <p className="mt-1 text-xs font-semibold text-gemini-blue">
                                      {tweet.summary}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs text-ink-muted">
                                    {tweet.textPreview}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
    </section>
  );
}
