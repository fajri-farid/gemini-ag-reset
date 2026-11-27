"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowUpRight, Heart, Sparkles, Tag } from "lucide-react";
import { CURRENT_TAG } from "@/config/releases";
import { siteConfig } from "@/config/site";
import { ensureCommunitySession, postCommunityMutation } from "@/lib/community-client";
import { formatShortMinutesAgo } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import {
  LOVE_DEBOUNCE_MS,
  MAX_DAILY_SITE_LOVES,
  MAX_LOVE_DELTA_PER_REQUEST,
} from "@/lib/sticky-notes";
import type { Locale, SyncStatusState } from "@/lib/types";

interface LoveBurst {
  id: number;
  dx: number;
  dy: number;
  rot: number;
}

const DAILY_LOVE_STORAGE_KEY = "gemini-resets-love-daily-v3";

const BURST_OFFSETS: readonly { dx: number; dy: number; rot: number }[] = [
  { dx: -14, dy: -46, rot: -12 },
  { dx: 12, dy: -50, rot: 14 },
  { dx: -4, dy: -54, rot: -6 },
  { dx: 18, dy: -44, rot: 10 },
  { dx: -18, dy: -48, rot: -15 },
];

function getUtcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readDailyLocalLoveCount(): number {
  try {
    const raw = window.localStorage.getItem(DAILY_LOVE_STORAGE_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw) as { day?: string; count?: number };
    if (
      parsed.day === getUtcDayKey() &&
      typeof parsed.count === "number" &&
      Number.isFinite(parsed.count) &&
      parsed.count >= 0
    ) {
      return Math.min(MAX_DAILY_SITE_LOVES, Math.floor(parsed.count));
    }
    return 0;
  } catch {
    return 0;
  }
}

function writeDailyLocalLoveCount(count: number, day: string): void {
  try {
    window.localStorage.setItem(
      DAILY_LOVE_STORAGE_KEY,
      JSON.stringify({
        day,
        count: Math.min(MAX_DAILY_SITE_LOVES, Math.max(0, Math.floor(count))),
      }),
    );
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

interface TrackerHeaderProps {
  dict: Dictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  lastCheckedAt: string | null;
  lastStatus: SyncStatusState;
  initialSiteLoveCount: number;
  now: Date;
}

export function TrackerHeader({
  dict,
  locale,
  onLocaleChange,
  lastCheckedAt,
  lastStatus,
  initialSiteLoveCount,
  now,
}: TrackerHeaderProps) {
  const statusText =
    lastStatus === "error"
      ? dict.header.checkingDelayed
      : lastCheckedAt
        ? `${dict.header.lastCheckedPrefix} ${formatShortMinutesAgo(lastCheckedAt, locale, now)}`
        : dict.header.neverChecked;

  const isDelayed = lastStatus === "error";
  const [displayLoveCount, setDisplayLoveCount] = useState(initialSiteLoveCount);
  const [dailyDay, setDailyDay] = useState("");
  const [dailyMyLikes, setDailyMyLikes] = useState(0);
  const [loveFailed, setLoveFailed] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [bursts, setBursts] = useState<LoveBurst[]>([]);

  const burstTimersRef = useRef<number[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef(0);
  const pendingDayRef = useRef("");
  const sendingRef = useRef(false);
  const dayRef = useRef("");
  const confirmedRef = useRef(0);
  const activeBatchRef = useRef<{ day: string; delta: number } | null>(null);

  const flushPendingLove = useCallback(async () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      while (pendingDeltaRef.current > 0) {
        const delta = Math.min(MAX_LOVE_DELTA_PER_REQUEST, pendingDeltaRef.current);
        const day = pendingDayRef.current;
        pendingDeltaRef.current -= delta;
        activeBatchRef.current = { day, delta };
        const body = JSON.stringify({ delta, day, batchId: crypto.randomUUID() });
        let accepted = 0;
        let remaining: number | undefined;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await postCommunityMutation("/api/love", body, true);
            if ((response.status === 502 || response.status === 504) && attempt === 0) continue;
            const data = await response.json().catch(() => null);
            if (response.ok && typeof data?.acceptedDelta === "number") accepted = data.acceptedDelta;
            if (typeof data?.remainingDaily === "number") remaining = data.remainingDaily;
            break;
          } catch {
            // Retry with the same batch ID if the result is unknown.
          }
        }
        activeBatchRef.current = null;
        setDisplayLoveCount((count) => Math.max(0, count - delta + accepted));
        setLoveFailed(accepted === 0 && remaining === undefined);
        if (day === dayRef.current) {
          if (remaining !== undefined) {
            confirmedRef.current = MAX_DAILY_SITE_LOVES - remaining;
            writeDailyLocalLoveCount(confirmedRef.current, day);
          }
          setDailyMyLikes(Math.min(MAX_DAILY_SITE_LOVES, confirmedRef.current + pendingDeltaRef.current));
        }
      }
    } finally {
      sendingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      if (dayRef.current) return;
      dayRef.current = getUtcDayKey();
      setDailyDay(dayRef.current);
      confirmedRef.current = readDailyLocalLoveCount();
      setDailyMyLikes(confirmedRef.current);
    }, 0);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushPendingLove();
      }
    };
    const handlePageHide = () => {
      void flushPendingLove();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    const timers = burstTimersRef.current;
    return () => {
      window.clearTimeout(syncTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      void flushPendingLove();
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [flushPendingLove]);

  const currentDay = now.toISOString().slice(0, 10);
  const isDailyLimitReached = dailyDay === currentDay && dailyMyLikes >= MAX_DAILY_SITE_LOVES;

  const handleSendLove = () => {
    const day = getUtcDayKey();
    if (dayRef.current !== day) {
      void flushPendingLove();
      if (pendingDeltaRef.current > 0) return;
      dayRef.current = day;
      setDailyDay(day);
      confirmedRef.current = readDailyLocalLoveCount();
    }
    const inFlight = activeBatchRef.current?.day === day ? activeBatchRef.current.delta : 0;
    const used = confirmedRef.current + pendingDeltaRef.current + inFlight;
    if (used >= MAX_DAILY_SITE_LOVES) return;

    void ensureCommunitySession().catch(() => {});
    setLoveFailed(false);
    setDailyMyLikes(used + 1);
    setDisplayLoveCount((prev) => prev + 1);
    pendingDayRef.current = day;
    pendingDeltaRef.current += 1;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void flushPendingLove();
    }, LOVE_DEBOUNCE_MS);

    const nextPop = popKey + 1;
    setPopKey(nextPop);

    const preset = BURST_OFFSETS[nextPop % BURST_OFFSETS.length] ?? {
      dx: 0,
      dy: -48,
      rot: 0,
    };
    const burstId = Date.now() + nextPop;
    setBursts((prev) => [
      ...prev.slice(-7),
      { id: burstId, dx: preset.dx, dy: preset.dy, rot: preset.rot },
    ]);

    const timer = window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 760);
    burstTimersRef.current.push(timer);
  };

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {siteConfig.name}
            </h1>
            <Link
              href="/changelog"
              className="neo-interactive inline-flex min-h-6 items-center gap-1 rounded-full bg-gemini-tint px-2.5 py-0.5 font-mono text-xs font-bold text-gemini-blue hover:bg-gemini-blue hover:text-white"
            >
              <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{CURRENT_TAG}</span>
              <span className="sr-only">
                {" "}
                — {dict.header.versionBadgeContext}
              </span>
            </Link>
          </div>
        </div>

        <div
          className="inline-flex overflow-hidden rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#111111]"
          role="group"
          aria-label={dict.header.languageSwitchLabel}
        >
          <button
            type="button"
            aria-pressed={locale === "en"}
            onClick={() => onLocaleChange("en")}
            className={`px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              locale === "en"
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            aria-pressed={locale === "id"}
            onClick={() => onLocaleChange("id")}
            className={`border-l-2 border-ink px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              locale === "id"
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            ID
          </button>
        </div>
      </div>

      <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
        {dict.header.tagline}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface px-3.5 py-1.5 font-mono text-xs font-medium text-ink shadow-[2px_2px_0px_#111111]">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full border border-ink ${
              isDelayed ? "bg-warning" : "bg-reset-live"
            }`}
            aria-hidden="true"
          />
          <span>{statusText}</span>
        </div>

        <a
          href={siteConfig.targetAccount.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="neo-interactive inline-flex items-center gap-1.5 bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-gemini-tint"
        >
          <span>{dict.header.viewProfile}</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>

        <div className="relative inline-flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2"
          >
            {bursts.map((burst) => (
              <span
                key={burst.id}
                style={
                  {
                    "--dx": `${burst.dx}px`,
                    "--dy": `${burst.dy}px`,
                    "--rot": `${burst.rot}deg`,
                  } as CSSProperties
                }
                className="love-float-particle absolute items-center gap-0.5 rounded-full border border-ink bg-gemini-blue px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white shadow-[1px_1px_0px_#111111]"
              >
                <Heart
                  className="h-2.5 w-2.5 fill-white text-white"
                  aria-hidden="true"
                />
                <span>+1</span>
                <Sparkles
                  className="h-2.5 w-2.5 text-amber-200"
                  aria-hidden="true"
                />
              </span>
            ))}
          </div>

          <button
            type="button"
            disabled={isDailyLimitReached}
            title={
              isDailyLimitReached
                ? dict.header.loveDailyLimitReached
                : dict.header.loveButtonLabel
            }
            aria-label={
              isDailyLimitReached
                ? dict.header.loveDailyLimitReached
                : dict.header.loveButtonLabel
            }
            onClick={handleSendLove}
            className={`neo-interactive inline-flex items-center gap-1.5 px-3.5 py-1.5 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-75 ${
              dailyMyLikes > 0
                ? "bg-gemini-tint text-gemini-blue"
                : "bg-surface text-ink hover:bg-gemini-tint"
            }`}
          >
            <Heart
              key={popKey}
              className={`h-3.5 w-3.5 shrink-0 ${
                dailyMyLikes > 0
                  ? "heart-pop fill-gemini-sky text-gemini-blue"
                  : "text-gemini-sky"
              }`}
              aria-hidden="true"
            />
            <span className="tabular-nums">{displayLoveCount}</span>
            {dailyMyLikes > 0 && (
              <span className="rounded bg-gemini-blue px-1 py-0.5 text-[10px] font-extrabold leading-none text-white tabular-nums">
                +{dailyMyLikes}
              </span>
            )}
          </button>
          <span role="status" className="sr-only">
            {loveFailed ? dict.header.loveSaveError : ""}
          </span>
        </div>
      </div>
    </header>
  );
}
