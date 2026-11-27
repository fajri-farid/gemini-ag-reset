"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { postCommunityMutation } from "@/lib/community-client";
import {
  AlertCircle,
  AlignLeft,
  AppWindow,
  Check,
  Clock,
  Flame,
  Lightbulb,
  MessageSquare,
  Pin,
  Shuffle,
  Sparkles,
  StickyNote as StickyNoteIcon,
  Ticket,
  X,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import {
  DEFAULT_UNPINNED_ORDER,
  STICKY_NOTE_COLORS,
  STICKY_NOTE_COLOR_STYLES,
  STICKY_NOTE_MESSAGE_MAX,
  STICKY_NOTE_MOODS,
  STICKY_NOTE_NAME_MAX,
  STICKY_NOTE_TEMPLATES,
  pickRandomStickyNoteColor,
  validateStickyNoteInput,
  type StickyNote,
  type StickyNoteColor,
  type StickyNoteColorChoice,
  type StickyNoteMood,
  type StickyNoteTemplate,
} from "@/lib/sticky-notes";
import type { Locale } from "@/lib/types";
import { StickyNoteCard } from "./StickyNoteCard";

interface WriteNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitNote: (note: StickyNote) => void;
  dict: Dictionary;
  locale: Locale;
  now: Date;
  nextSerialNumber: number;
}

interface TouchedFields {
  authorName: boolean;
  message: boolean;
}

const INITIAL_TOUCHED: TouchedFields = {
  authorName: false,
  message: false,
};

function TemplateIcon({ template }: { template: StickyNoteTemplate }) {
  switch (template) {
    case "classic-tape":
      return <StickyNoteIcon className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "lined-pad":
      return <AlignLeft className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "pixel-window":
      return <AppWindow className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "ticket-stub":
      return <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case "polaroid-pin":
      return <Pin className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }
}

function MoodButtonIcon({ mood }: { mood: StickyNoteMood }) {
  switch (mood) {
    case "thanks":
      return <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case "feedback":
      return (
        <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      );
    case "idea":
      return <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case "waiting":
      return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
    case "vibe":
      return <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
}

export function WriteNoteDialog({
  open,
  onClose,
  onSubmitNote,
  dict,
  locale,
  now,
  nextSerialNumber,
}: WriteNoteDialogProps) {
  const dialogTitleId = useId();
  const nameInputId = useId();
  const nameHintId = useId();
  const nameErrorId = useId();
  const messageInputId = useId();
  const messageHintId = useId();
  const messageErrorId = useId();

  const requestRef = useRef<{ draft: string; requestId: string; submittedAt: number } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [websiteHoneypot, setWebsiteHoneypot] = useState("");
  const [mood, setMood] = useState<StickyNoteMood | null>("thanks");
  const [colorChoice, setColorChoice] =
    useState<StickyNoteColorChoice>("random");
  const [randomPreviewColor, setRandomPreviewColor] =
    useState<StickyNoteColor>("butter");
  const [template, setTemplate] = useState<StickyNoteTemplate>("classic-tape");
  const [touched, setTouched] = useState<TouchedFields>(INITIAL_TOUCHED);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const validation = validateStickyNoteInput({
    authorName,
    message,
    mood,
    colorChoice,
    template,
  });

  const nameErrorCode =
    (touched.authorName || submitted) && !validation.ok
      ? validation.errors.authorName
      : undefined;

  const messageErrorCode =
    (touched.message || submitted) && !validation.ok
      ? validation.errors.message
      : undefined;

  const nameErrorText =
    nameErrorCode === "required"
      ? dict.notes.nameRequiredError
      : nameErrorCode === "too_long"
        ? dict.notes.nameTooLongError
        : nameErrorCode === "contains_url"
          ? dict.notes.urlBlockedError
          : null;

  const messageErrorText =
    messageErrorCode === "required"
      ? dict.notes.messageRequiredError
      : messageErrorCode === "too_long"
        ? dict.notes.messageTooLongError
        : messageErrorCode === "contains_url"
          ? dict.notes.urlBlockedError
          : null;

  const previewColor: StickyNoteColor =
    colorChoice === "random" ? randomPreviewColor : colorChoice;

  const previewNote: StickyNote = {
    id: "preview-note",
    authorName,
    message,
    mood,
    color: previewColor,
    template,
    isPinned: false,
    pinOrder: DEFAULT_UNPINNED_ORDER,
    lovedByMaker: false,
    createdAt: now.toISOString(),
  };

  function handleDialogBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    if (event.target !== dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const isDialogContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!isDialogContent) {
      dialog.close();
    }
  }

  function handleShufflePreview() {
    setColorChoice("random");
    const alternatives = STICKY_NOTE_COLORS.filter(
      (candidate) => candidate !== randomPreviewColor,
    );
    const nextColor =
      alternatives[Math.floor(Math.random() * alternatives.length)] ??
      pickRandomStickyNoteColor();
    setRandomPreviewColor(nextColor);
  }

  function resetDraft() {
    requestRef.current = null;
    setAuthorName("");
    setMessage("");
    setWebsiteHoneypot("");
    setMood("thanks");
    setColorChoice("random");
    setRandomPreviewColor(pickRandomStickyNoteColor());
    setTemplate("classic-tape");
    setTouched(INITIAL_TOUCHED);
    setSubmitted(false);
    setSubmitError(null);
  }

  function handleRequestClose() {
    if (isSubmitting) {
      return;
    }
    dialogRef.current?.close();
  }

  function mapServerError(code?: string): string {
    switch (code) {
      case "contains_url":
        return dict.notes.urlBlockedError;
      case "rate_limited":
        return dict.notes.rateLimitedError;
      case "moderation_rejected":
        return dict.notes.moderationRejectedError;
      case "moderation_unavailable":
        return dict.notes.moderationBusyError;
      default:
        return dict.notes.submitGenericError;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setSubmitted(true);
    setSubmitError(null);

    if (!validation.ok) {
      if (validation.errors.authorName) {
        nameInputRef.current?.focus();
      } else if (validation.errors.message) {
        messageInputRef.current?.focus();
      }
      return;
    }

    const resolvedColor =
      validation.value.colorChoice === "random"
        ? randomPreviewColor
        : validation.value.colorChoice;

    setIsSubmitting(true);
    try {
      const draft = {
        authorName: validation.value.authorName,
        message: validation.value.message,
        mood: validation.value.mood,
        colorChoice: resolvedColor,
        template: validation.value.template,
        website: websiteHoneypot,
      };
      const serializedDraft = JSON.stringify(draft);
      if (requestRef.current?.draft !== serializedDraft) {
        requestRef.current = { draft: serializedDraft, requestId: crypto.randomUUID(), submittedAt: Date.now() };
      }
      const { requestId, submittedAt } = requestRef.current;
      const response = await postCommunityMutation("/api/notes", JSON.stringify({
        ...draft, requestId, submittedAt,
      }));

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        note?: StickyNote | null;
        code?: string;
      } | null;

      if (!response.ok) {
        if (response.status === 409) requestRef.current = null;
        setSubmitError(mapServerError(response.status === 429 ? "rate_limited" : payload?.code));
        return;
      }

      if (payload?.note) {
        onSubmitNote(payload.note);
      }
      resetDraft();
      dialogRef.current?.close();
    } catch {
      setSubmitError(dict.notes.submitGenericError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby={dialogTitleId}
      onClose={onClose}
      onClick={handleDialogBackdropClick}
      className="note-dialog m-auto max-h-[90dvh] w-[min(94vw,52rem)] overflow-y-auto rounded-xl border-2 border-ink bg-canvas p-5 text-ink shadow-[6px_6px_0px_#111111] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink/15 pb-3.5">
        <div>
          <h2
            id={dialogTitleId}
            className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
          >
            {dict.notes.dialogTitle}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">{dict.notes.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleRequestClose}
          disabled={isSubmitting}
          aria-label={dict.notes.closeLabel}
          className="neo-interactive inline-flex h-9 w-9 shrink-0 items-center justify-center bg-surface text-ink hover:bg-surface-muted disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1.2fr_0.95fr]">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
          className="flex flex-col gap-4"
        >
          {/* Hidden honeypot field (100% native HTML anti-bot trap, invisible to humans) */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor={`${nameInputId}-website`}>Website</label>
            <input
              id={`${nameInputId}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={websiteHoneypot}
              onChange={(event) => setWebsiteHoneypot(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor={nameInputId}
              className="block font-mono text-xs font-bold uppercase tracking-wider text-ink"
            >
              {dict.notes.nameLabel}
            </label>
            <p id={nameHintId} className="mt-0.5 text-xs text-ink-muted">
              {dict.notes.nameHint}
            </p>
            <input
              ref={nameInputRef}
              id={nameInputId}
              name="authorName"
              type="text"
              required
              maxLength={STICKY_NOTE_NAME_MAX}
              autoComplete="nickname"
              value={authorName}
              onChange={(event) => {
                setAuthorName(event.target.value);
                setSubmitError(null);
              }}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, authorName: true }))
              }
              aria-invalid={nameErrorText ? "true" : "false"}
              aria-describedby={
                nameErrorText ? `${nameHintId} ${nameErrorId}` : nameHintId
              }
              placeholder={dict.notes.namePlaceholder}
              className="note-input mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70"
            />
            {nameErrorText && (
              <p
                id={nameErrorId}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{nameErrorText}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor={messageInputId}
                className="block font-mono text-xs font-bold uppercase tracking-wider text-ink"
              >
                {dict.notes.messageLabel}
              </label>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-muted">
                {message.trim().length}/{STICKY_NOTE_MESSAGE_MAX}
              </span>
            </div>
            <p id={messageHintId} className="mt-0.5 text-xs text-ink-muted">
              {dict.notes.messageHint}
            </p>
            <textarea
              ref={messageInputRef}
              id={messageInputId}
              name="message"
              required
              rows={3}
              maxLength={STICKY_NOTE_MESSAGE_MAX}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setSubmitError(null);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
              aria-invalid={messageErrorText ? "true" : "false"}
              aria-describedby={
                messageErrorText
                  ? `${messageHintId} ${messageErrorId}`
                  : messageHintId
              }
              placeholder={dict.notes.messagePlaceholder}
              className="note-input mt-1.5 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70"
            />
            {messageErrorText && (
              <p
                id={messageErrorId}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger"
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{messageErrorText}</span>
              </p>
            )}
          </div>

          <fieldset>
            <legend className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              {dict.notes.moodLabel}{" "}
              <span className="font-normal normal-case text-ink-muted">
                ({dict.notes.moodOptionalHint})
              </span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {STICKY_NOTE_MOODS.map((option) => {
                const active = mood === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMood(active ? null : option)}
                    className={`neo-interactive inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs font-bold ${
                      active
                        ? "bg-ink text-white"
                        : "bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    <MoodButtonIcon mood={option} />
                    <span>{dict.notes.moods[option]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <div className="flex items-center justify-between gap-2">
              <legend className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                {dict.notes.colorLabel}
              </legend>
              {colorChoice === "random" && (
                <button
                  type="button"
                  onClick={handleShufflePreview}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-gemini-blue hover:text-gemini-violet"
                >
                  <Shuffle className="h-3 w-3" aria-hidden="true" />
                  <span>{dict.notes.shufflePreview}</span>
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={colorChoice === "random"}
                onClick={handleShufflePreview}
                className={`neo-interactive inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs font-bold ${
                  colorChoice === "random"
                    ? "bg-gemini-blue text-white"
                    : "bg-surface text-ink hover:bg-surface-muted"
                }`}
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{dict.notes.colors.random}</span>
              </button>

              {STICKY_NOTE_COLORS.map((color) => {
                const selected = colorChoice === color;
                const swatch = STICKY_NOTE_COLOR_STYLES[color].swatch;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={dict.notes.colors[color]}
                    aria-pressed={selected}
                    title={dict.notes.colors[color]}
                    onClick={() => setColorChoice(color)}
                    style={{ backgroundColor: swatch }}
                    className={`neo-interactive inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                      selected
                        ? "ring-2 ring-gemini-blue ring-offset-2 ring-offset-canvas"
                        : ""
                    }`}
                  >
                    {selected && (
                      <Check className="h-4 w-4 text-ink" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              {dict.notes.templateLabel}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STICKY_NOTE_TEMPLATES.map((option) => {
                const active = template === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTemplate(option)}
                    className={`neo-interactive inline-flex items-center gap-1.5 px-2.5 py-2 text-left text-xs font-bold ${
                      active
                        ? "bg-gemini-violet text-white"
                        : "bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    <TemplateIcon template={option} />
                    <span className="truncate">
                      {dict.notes.templates[option].short}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {submitError && (
            <p
              role="alert"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-danger bg-red-50 px-3 py-2 text-xs font-semibold text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t-2 border-ink/15 pt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRequestClose}
              className="neo-interactive bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50"
            >
              {dict.notes.cancelCta}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="neo-interactive inline-flex items-center gap-1.5 bg-gemini-blue px-4 py-2 text-xs font-bold text-white hover:bg-gemini-blue-hover disabled:cursor-wait disabled:opacity-70"
            >
              <StickyNoteIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                {isSubmitting
                  ? dict.notes.submittingCta
                  : dict.notes.submitCta}
              </span>
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-2.5 md:sticky md:top-0 md:self-start">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              {dict.notes.previewLabel}
            </span>
            <span className="rounded-md border border-ink bg-surface px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
              {dict.notes.templates[template].label}
            </span>
          </div>

          <div className="rounded-xl border-2 border-dashed border-ink/35 bg-surface-muted/55 p-4">
            <StickyNoteCard
              note={previewNote}
              dict={dict}
              locale={locale}
              now={now}
              serialNumber={nextSerialNumber}
              isPreview
            />
          </div>
        </aside>
      </div>
    </dialog>
  );
}
