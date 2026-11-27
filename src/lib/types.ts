import type { PublicNotesPage } from "./sticky-notes";

export type Locale = "en" | "id";

export type TimezoneMode = "varun" | "local";

export type ResetSource = "auto" | "manual";

export type SyncStatusState = "ok" | "error";

export type SyncTrigger = "cron" | "admin_live" | "admin_dry_run";

export type SyncErrorStage = "none" | "x_fetch" | "gemini" | "db";

export type HeroState = "reset_recently" | "waiting" | "empty";

export interface ResetEvidence {
  tweetId: string;
  tweetUrl: string;
  tweetText: string;
  resetAt: string;
}

export interface ResetRecord extends ResetEvidence {
  summary: string | null;
  confidence: number | null;
  source: ResetSource;
  createdAt: string;
  updatedAt: string;
}

export type ResetFeedCursor = Pick<ResetEvidence, "tweetId" | "resetAt">;

export interface ResetFeedItem extends ResetEvidence {
  gapMinutesFromPrevious: number | null;
}

export interface ResetFeedPage {
  items: ResetFeedItem[];
  nextCursor: ResetFeedCursor | null;
}

export interface SyncStatus {
  lastCheckedAt: string | null;
  lastSeenTweetId: string | null;
  lastStatus: SyncStatusState;
  lastErrorMessage: string | null;
  trackingStartedAt: string;
}

export interface EvaluatedTweetLog {
  tweetId: string;
  textPreview: string;
  isReset: boolean;
  confidence: number;
  summary: string | null;
  saved: boolean;
}

export interface SyncLog {
  id: string;
  ranAt: string;
  trigger: SyncTrigger;
  status: SyncStatusState;
  fetchedCount: number;
  savedCount: number;
  skippedCount: number;
  durationMs: number;
  errorStage: SyncErrorStage;
  errorMessage: string | null;
  evaluatedTweets: EvaluatedTweetLog[];
}

export interface TrackerMetrics {
  total: number;
  avgIntervalDays: number | null;
  longestWaitDays: number | null;
}

export interface HeatmapCell {
  dateKey: string;
  inTrackingRange: boolean;
  isFuture: boolean;
  isToday: boolean;
  hasReset: boolean;
  resets: ResetEvidence[];
}

export interface HeatmapWeek {
  weekStartKey: string;
  monthLabel: string | null;
  cells: HeatmapCell[];
}

export interface DynamicHeatmapData {
  trackingStartKey: string;
  rangeStartKey: string;
  rangeEndKey: string;
  totalWeeks: number;
  totalResetDays: number;
  weeks: HeatmapWeek[];
}

export interface PublicTrackerPayload {
  resets: ResetRecord[];
  metrics: TrackerMetrics;
  heroState: HeroState;
  syncStatus: Pick<
    SyncStatus,
    "lastCheckedAt" | "lastStatus" | "trackingStartedAt"
  >;
  generatedAt: string;
}

export interface PublicTrackerHomeData {
  feed: ResetFeedPage;
  heatmapResets: ResetEvidence[];
  historicalMetrics: TrackerMetrics;
  syncStatus: PublicTrackerPayload["syncStatus"];
  notesPreview: PublicNotesPage;
  siteLoveCount: number;
  generatedAt: string;
}
