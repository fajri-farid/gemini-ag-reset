import "server-only";
import { siteConfig } from "@/config/site";
import type {
  EvaluatedTweetLog,
  ResetRecord,
  SyncErrorStage,
  SyncLog,
  SyncTrigger,
} from "@/lib/types";
import { sanitizeErrorMessage } from "./error-sanitizer";
import {
  RESET_CONFIDENCE_THRESHOLD,
  createDefaultResetClassifier,
  type ResetClassifier,
} from "./reset-classifier";
import { getResetRepository, type ResetRepository } from "./reset-repository";
import {
  createDefaultXDataProvider,
  type FetchedTweet,
  type XDataProvider,
} from "./x-provider";

export interface RunSyncOptions {
  trigger: SyncTrigger;
  dryRun?: boolean;
  repository?: ResetRepository;
  xProvider?: XDataProvider;
  classifier?: ResetClassifier;
  onRevalidate?: (resetsChanged: boolean) => void;
  now?: () => Date;
}

export interface RunSyncResult {
  log: SyncLog;
  savedResets: ResetRecord[];
  dryRun: boolean;
}

function toTextPreview(text: string, maxLength = 180): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function getHighestTweetId(
  tweets: readonly FetchedTweet[],
  currentHighest: string | null,
): string | null {
  let highest = currentHighest;
  for (const tweet of tweets) {
    if (!/^\d+$/.test(tweet.tweetId)) {
      continue;
    }
    if (!highest || !/^\d+$/.test(highest)) {
      highest = tweet.tweetId;
      continue;
    }
    if (BigInt(tweet.tweetId) > BigInt(highest)) {
      highest = tweet.tweetId;
    }
  }
  return highest;
}

export async function runSync(options: RunSyncOptions): Promise<RunSyncResult> {
  const dryRun = Boolean(options.dryRun);
  const nowFn = options.now ?? (() => new Date());
  const startedAt = nowFn();
  const repo = options.repository ?? getResetRepository();
  const xProvider = options.xProvider ?? createDefaultXDataProvider();
  const classifier = options.classifier ?? createDefaultResetClassifier();
  const { onRevalidate } = options;

  const status = await repo.getSyncStatus();
  const ranAtIso = startedAt.toISOString();

  let fetchedTweets: FetchedTweet[] = [];
  try {
    fetchedTweets = await xProvider.fetchNewTweets(
      siteConfig.targetAccount.username,
      status.lastSeenTweetId,
    );
  } catch (error) {
    const errorMessage = sanitizeErrorMessage(error);
    if (!dryRun) {
      await repo.updateSyncStatus({
        lastCheckedAt: nowFn().toISOString(),
        lastStatus: "error",
        lastErrorMessage: errorMessage,
      });
      onRevalidate?.(false);
    }
    const log = await repo.appendSyncLog({
      ranAt: ranAtIso,
      trigger: options.trigger,
      status: "error",
      fetchedCount: 0,
      savedCount: 0,
      skippedCount: 0,
      durationMs: Math.max(0, nowFn().getTime() - startedAt.getTime()),
      errorStage: "x_fetch",
      errorMessage,
      evaluatedTweets: [],
    });
    return { log, savedResets: [], dryRun };
  }

  const evaluatedTweets: EvaluatedTweetLog[] = [];
  const savedResets: ResetRecord[] = [];
  let skippedCount = 0;

  for (const tweet of fetchedTweets) {
    let classification;
    try {
      classification = await classifier.classify(tweet.tweetText);
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(error);
      if (!dryRun) {
        await repo.updateSyncStatus({
          lastCheckedAt: nowFn().toISOString(),
          lastStatus: "error",
          lastErrorMessage: errorMessage,
        });
        onRevalidate?.(savedResets.length > 0);
      }
      const log = await repo.appendSyncLog({
        ranAt: ranAtIso,
        trigger: options.trigger,
        status: "error",
        fetchedCount: fetchedTweets.length,
        savedCount: savedResets.length,
        skippedCount,
        durationMs: Math.max(0, nowFn().getTime() - startedAt.getTime()),
        errorStage: "gemini",
        errorMessage,
        evaluatedTweets,
      });
      return { log, savedResets, dryRun };
    }

    const qualifies =
      classification.isReset &&
      classification.confidence >= RESET_CONFIDENCE_THRESHOLD;

    if (qualifies && !dryRun) {
      try {
        const saved = await repo.upsertReset({
          tweetId: tweet.tweetId,
          tweetUrl: tweet.tweetUrl,
          tweetText: tweet.tweetText,
          summary: classification.summary,
          confidence: classification.confidence,
          source: "auto",
          resetAt: tweet.createdAt,
        });
        savedResets.push(saved);
      } catch (error) {
        const errorMessage = sanitizeErrorMessage(error);
        await repo.updateSyncStatus({
          lastCheckedAt: nowFn().toISOString(),
          lastStatus: "error",
          lastErrorMessage: errorMessage,
        });
        onRevalidate?.(savedResets.length > 0);
        const log = await repo.appendSyncLog({
          ranAt: ranAtIso,
          trigger: options.trigger,
          status: "error",
          fetchedCount: fetchedTweets.length,
          savedCount: savedResets.length,
          skippedCount,
          durationMs: Math.max(0, nowFn().getTime() - startedAt.getTime()),
          errorStage: "db",
          errorMessage,
          evaluatedTweets,
        });
        return { log, savedResets, dryRun };
      }
    } else if (!qualifies) {
      skippedCount += 1;
    }

    evaluatedTweets.push({
      tweetId: tweet.tweetId,
      textPreview: toTextPreview(tweet.tweetText),
      isReset: classification.isReset,
      confidence: classification.confidence,
      summary: classification.summary,
      saved: qualifies && !dryRun,
    });
  }

  const nextLastSeenTweetId = getHighestTweetId(
    fetchedTweets,
    status.lastSeenTweetId,
  );

  if (!dryRun) {
    try {
      await repo.updateSyncStatus({
        lastCheckedAt: nowFn().toISOString(),
        lastSeenTweetId: nextLastSeenTweetId,
        lastStatus: "ok",
        lastErrorMessage: null,
      });
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(error);
      if (savedResets.length > 0) {
        onRevalidate?.(true);
      }
      const log = await repo.appendSyncLog({
        ranAt: ranAtIso,
        trigger: options.trigger,
        status: "error",
        fetchedCount: fetchedTweets.length,
        savedCount: savedResets.length,
        skippedCount,
        durationMs: Math.max(0, nowFn().getTime() - startedAt.getTime()),
        errorStage: "db" satisfies SyncErrorStage,
        errorMessage,
        evaluatedTweets,
      });
      return { log, savedResets, dryRun };
    }

    onRevalidate?.(savedResets.length > 0);
  }

  const log = await repo.appendSyncLog({
    ranAt: ranAtIso,
    trigger: options.trigger,
    status: "ok",
    fetchedCount: fetchedTweets.length,
    savedCount: savedResets.length,
    skippedCount,
    durationMs: Math.max(0, nowFn().getTime() - startedAt.getTime()),
    errorStage: "none",
    errorMessage: null,
    evaluatedTweets,
  });

  return { log, savedResets, dryRun };
}
