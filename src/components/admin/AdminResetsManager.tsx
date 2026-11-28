"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
  type CreateManualResetInput,
  type UpdateManualResetInput,
} from "@/lib/admin-api";
import { formatTimestamp } from "@/lib/datetime";
import { extractTweetIdFromUrl } from "@/lib/tweet-url";
import type { ResetRecord } from "@/lib/types";

interface AdminResetsManagerProps {
  resets: ResetRecord[];
  onCreateReset: (input: CreateManualResetInput) => Promise<void>;
  onUpdateReset: (
    tweetId: string,
    input: UpdateManualResetInput,
  ) => Promise<void>;
  onDeleteReset: (tweetId: string) => Promise<void>;
}

interface TouchedFields {
  tweetUrlOrId: boolean;
  resetAt: boolean;
  tweetText: boolean;
}

const INITIAL_TOUCHED: TouchedFields = {
  tweetUrlOrId: false,
  resetAt: false,
  tweetText: false,
};

export function AdminResetsManager({
  resets,
  onCreateReset,
  onUpdateReset,
  onDeleteReset,
}: AdminResetsManagerProps) {
  const tweetInputId = useId();
  const tweetHintId = useId();
  const tweetErrorId = useId();
  const resetAtInputId = useId();
  const resetAtHintId = useId();
  const resetAtErrorId = useId();
  const tweetTextInputId = useId();
  const tweetTextHintId = useId();
  const tweetTextErrorId = useId();
  const summaryInputId = useId();
  const summaryHintId = useId();

  const [editingTweetId, setEditingTweetId] = useState<string | null>(null);
  const [tweetUrlOrId, setTweetUrlOrId] = useState("");
  const [resetAtLocal, setResetAtLocal] = useState(() =>
    isoToDatetimeLocalValue(new Date().toISOString()),
  );
  const [tweetText, setTweetText] = useState("");
  const [summary, setSummary] = useState("");
  const [sendPush, setSendPush] = useState(false);

  const [touched, setTouched] = useState<TouchedFields>(INITIAL_TOUCHED);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pendingDeleteReset, setPendingDeleteReset] =
    useState<ResetRecord | null>(null);
  const [deletingTweetId, setDeletingTweetId] = useState<string | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (pendingDeleteReset && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [pendingDeleteReset]);

  const parsedTweetId = editingTweetId ?? extractTweetIdFromUrl(tweetUrlOrId);
  const parsedResetAtIso = datetimeLocalValueToIso(resetAtLocal);
  const trimmedTweetText = tweetText.trim();

  const tweetError =
    !editingTweetId && (touched.tweetUrlOrId || submitted) && !parsedTweetId
      ? "Enter a valid X/Twitter status URL or a 10–25 digit numeric tweet ID."
      : null;

  const resetAtError =
    (touched.resetAt || submitted) && !parsedResetAtIso
      ? "Enter a valid date and time for when the tweet was posted."
      : null;

  const tweetTextError =
    (touched.tweetText || submitted) &&
    (trimmedTweetText.length === 0 || trimmedTweetText.length > 4000)
      ? "Tweet text is required (max 4,000 characters)."
      : null;

  const resetFormToCreate = () => {
    setEditingTweetId(null);
    setTweetUrlOrId("");
    setResetAtLocal(isoToDatetimeLocalValue(new Date().toISOString()));
    setTweetText("");
    setSummary("");
    setSendPush(false);
    setTouched(INITIAL_TOUCHED);
    setSubmitted(false);
    setFormError(null);
  };

  const handleStartEdit = (record: ResetRecord) => {
    setEditingTweetId(record.tweetId);
    setTweetUrlOrId(record.tweetUrl);
    setResetAtLocal(isoToDatetimeLocalValue(record.resetAt));
    setTweetText(record.tweetText);
    setSummary(record.summary ?? "");
    setTouched(INITIAL_TOUCHED);
    setSubmitted(false);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);

    if (!parsedTweetId || !parsedResetAtIso || !trimmedTweetText) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTweetId) {
        await onUpdateReset(editingTweetId, {
          tweetText: trimmedTweetText,
          summary: summary.trim() || null,
          resetAt: parsedResetAtIso,
        });
      } else {
        await onCreateReset({
          tweetUrlOrId: parsedTweetId,
          tweetText: trimmedTweetText,
          summary: summary.trim() || null,
          resetAt: parsedResetAtIso,
          sendPush,
        });
      }
      resetFormToCreate();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save reset record.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    const dialog = event.currentTarget;
    const decision = dialog.returnValue;
    dialog.returnValue = "";

    const target = pendingDeleteReset;
    setPendingDeleteReset(null);

    if (decision === "delete" && target) {
      setDeletingTweetId(target.tweetId);
      void onDeleteReset(target.tweetId).finally(() => {
        setDeletingTweetId((current) =>
          current === target.tweetId ? null : current,
        );
      });
    }
  };

  return (
    <section
      aria-labelledby="admin-resets-heading"
      className="neo-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="admin-resets-heading"
            className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
          >
            Manual Reset Records ({resets.length})
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Seed historical resets from the past month or edit/delete stored
            records.
          </p>
        </div>

        {editingTweetId && (
          <button
            type="button"
            onClick={resetFormToCreate}
            className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-ink hover:bg-surface-muted"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cancel Edit</span>
          </button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-5 rounded-xl border-2 border-ink bg-canvas p-4"
      >
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-gemini-blue">
          {editingTweetId
            ? `Editing Tweet #${editingTweetId}`
            : "Add / Upsert Manual Reset"}
        </h3>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={tweetInputId}
              className="block font-mono text-xs font-bold text-ink"
            >
              Tweet URL or ID
            </label>
            <p id={tweetHintId} className="mt-0.5 text-xs text-ink-muted">
              Example: https://x.com/_mohansolo/status/1861234567890123456
            </p>
            <input
              id={tweetInputId}
              type="text"
              required
              readOnly={Boolean(editingTweetId)}
              value={tweetUrlOrId}
              onChange={(event) => {
                setTweetUrlOrId(event.target.value);
                setFormError(null);
              }}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, tweetUrlOrId: true }))
              }
              aria-invalid={tweetError ? "true" : "false"}
              aria-describedby={
                tweetError ? `${tweetHintId} ${tweetErrorId}` : tweetHintId
              }
              className="admin-input mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 font-mono text-xs text-ink read-only:bg-surface-muted"
              placeholder="https://x.com/_mohansolo/status/..."
            />
            {!editingTweetId && parsedTweetId && (
              <p className="mt-1 font-mono text-[11px] font-semibold text-gemini-blue">
                Extracted tweetId: {parsedTweetId}
              </p>
            )}
            {tweetError && (
              <p
                id={tweetErrorId}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{tweetError}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={resetAtInputId}
              className="block font-mono text-xs font-bold text-ink"
            >
              Announcement Time (Browser Local -&gt; Saved as UTC)
            </label>
            <p id={resetAtHintId} className="mt-0.5 text-xs text-ink-muted">
              Enter the tweet publish timestamp in your local browser time.
            </p>
            <input
              id={resetAtInputId}
              type="datetime-local"
              required
              value={resetAtLocal}
              onChange={(event) => {
                setResetAtLocal(event.target.value);
                setFormError(null);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, resetAt: true }))}
              aria-invalid={resetAtError ? "true" : "false"}
              aria-describedby={
                resetAtError
                  ? `${resetAtHintId} ${resetAtErrorId}`
                  : resetAtHintId
              }
              className="admin-input mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 font-mono text-xs text-ink"
            />
            {resetAtError && (
              <p
                id={resetAtErrorId}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{resetAtError}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor={tweetTextInputId}
            className="block font-mono text-xs font-bold text-ink"
          >
            Original Tweet Text
          </label>
          <p id={tweetTextHintId} className="mt-0.5 text-xs text-ink-muted">
            Paste the exact tweet copy shown on X (up to 4,000 characters).
          </p>
          <textarea
            id={tweetTextInputId}
            required
            rows={3}
            maxLength={4000}
            value={tweetText}
            onChange={(event) => {
              setTweetText(event.target.value);
              setFormError(null);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, tweetText: true }))}
            aria-invalid={tweetTextError ? "true" : "false"}
            aria-describedby={
              tweetTextError
                ? `${tweetTextHintId} ${tweetTextErrorId}`
                : tweetTextHintId
            }
            className="admin-input mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink"
            placeholder="Another Gemini quota reset in Antigravity! ..."
          />
          {tweetTextError && (
            <p
              id={tweetTextErrorId}
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
            >
              <AlertCircle
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{tweetTextError}</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor={summaryInputId}
              className="block font-mono text-xs font-bold text-ink"
            >
              Short Summary (Optional)
            </label>
            <p id={summaryHintId} className="mt-0.5 text-xs text-ink-muted">
              Optional 1-sentence note displayed on the Hero Card when this is
              the latest reset.
            </p>
            <input
              id={summaryInputId}
              type="text"
              maxLength={300}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              aria-describedby={summaryHintId}
              className="mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink"
              placeholder="Gemini quota reset announced for Antigravity users."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="neo-interactive inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-gemini-blue px-4 font-mono text-xs font-bold text-white hover:bg-gemini-blue-hover disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSubmitting
                ? "Saving..."
                : editingTweetId
                  ? "Save Changes"
                  : "Save Reset"}
            </span>
          </button>
        </div>

        {!editingTweetId && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={(event) => setSendPush(event.target.checked)}
              className="h-4 w-4 rounded border-2 border-ink accent-gemini-blue"
            />
            <span>
              Send push notification to subscribers (leave unchecked for historical backfill)
            </span>
          </label>
        )}

        {formError && (
          <p
            role="status"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </p>
        )}
      </form>

      {resets.length === 0 ? (
        <div className="mt-5 rounded-xl border-2 border-dashed border-ink/25 bg-surface-muted/40 p-6 text-center text-sm text-ink-muted">
          No reset records stored yet. Use Live Sync or the form above to add
          your initial reset announcements.
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {resets.map((item) => (
            <li
              key={item.tweetId}
              className="rounded-xl border-2 border-ink bg-surface p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                      item.source === "auto"
                        ? "bg-gemini-blue text-white"
                        : "bg-gemini-violet text-white"
                    }`}
                  >
                    {item.source}
                  </span>
                  {item.confidence !== null && (
                    <span className="rounded border border-ink bg-canvas px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                      confidence: {item.confidence.toFixed(2)}
                    </span>
                  )}
                  <time
                    dateTime={item.resetAt}
                    className="font-mono text-xs text-ink-muted"
                  >
                    {formatTimestamp(item.resetAt, "en", "UTC")}
                  </time>
                  <a
                    href={item.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold text-gemini-blue hover:text-gemini-violet"
                  >
                    <span>#{item.tweetId}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-2.5 py-1 font-mono text-xs font-bold text-ink hover:bg-gemini-tint"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={deletingTweetId === item.tweetId}
                    onClick={() => setPendingDeleteReset(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-2.5 py-1 font-mono text-xs font-bold text-danger hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {deletingTweetId === item.tweetId
                        ? "Deleting..."
                        : "Delete"}
                    </span>
                  </button>
                </div>
              </div>

              {item.summary && (
                <p className="mt-2 text-xs font-semibold text-gemini-blue">
                  {item.summary}
                </p>
              )}
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">
                {item.tweetText}
              </p>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-reset-dialog-title"
        onClose={handleDialogClose}
        className="m-auto w-[min(92vw,28rem)] rounded-xl border-2 border-ink bg-surface p-6 text-ink shadow-[4px_4px_0px_#111111]"
      >
        <h1
          id="delete-reset-dialog-title"
          className="text-lg font-extrabold tracking-tight text-ink"
        >
          Delete this reset record?
        </h1>
        {pendingDeleteReset && (
          <div className="mt-3 rounded-lg border-2 border-ink bg-canvas p-3 text-xs">
            <p className="font-mono font-bold text-ink">
              #{pendingDeleteReset.tweetId} ·{" "}
              {formatTimestamp(pendingDeleteReset.resetAt, "en", "UTC")}
            </p>
            <p className="mt-1.5 line-clamp-3 text-ink-muted">
              {pendingDeleteReset.tweetText}
            </p>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-muted">
          This removes the record from Firestore and triggers revalidation of
          the public tracker page.
        </p>
        <form
          method="dialog"
          className="mt-5 flex flex-wrap items-center justify-end gap-3"
        >
          <button
            type="submit"
            value="cancel"
            autoFocus
            className="neo-interactive bg-surface px-4 py-2 font-mono text-xs font-bold text-ink hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            value="delete"
            className="neo-interactive bg-danger px-4 py-2 font-mono text-xs font-bold text-white hover:opacity-90"
          >
            Delete Reset
          </button>
        </form>
      </dialog>
    </section>
  );
}
