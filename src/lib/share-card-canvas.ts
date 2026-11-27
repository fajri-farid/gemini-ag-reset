"use client";

import { isFreshReset, RESET_DESIGNS } from "./reset-announcement";
import { drawResetAnnouncement } from "./reset-announcement-canvas";
import type { ShareCardRatio } from "./share-params";
import { drawShareWebCard, SHARE_WEB_VERSIONS } from "./share-web-cards";
import type {
  HeroState,
  Locale,
  ResetEvidence,
  TrackerMetrics,
} from "./types";

export interface ClientShareCardInput {
  ratio: ShareCardRatio;
  mode: "hero" | "item";
  heroState: HeroState;
  reset: ResetEvidence;
  metrics: TrackerMetrics;
  heatmapResets: readonly ResetEvidence[];
  trackingStartedAt: string;
  locale: Locale;
  timeZone: string;
  now: Date;
  displayHost?: string;
}

/**
 * Renders the appropriate share card locally on HTML5 Canvas 2D (zero server compute):
 * - `< 5 hours` since reset on Hero mode -> Gemini Blue Reset Announcement card
 * - `>= 5 hours` or archive item -> Warm Cream Full Overview tracker card with 24-week heatmap
 */
export async function renderShareCardToCanvas(
  canvas: HTMLCanvasElement,
  input: ClientShareCardInput,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const showFreshAnnouncement =
    input.mode === "hero" &&
    isFreshReset(input.reset.resetAt, input.now.getTime());

  if (showFreshAnnouncement) {
    await drawResetAnnouncement(
      canvas,
      {
        design: RESET_DESIGNS[0],
        ratio: input.ratio,
        locale: input.locale,
        timeZone: input.timeZone,
        reset: input.reset,
      },
      isCurrent,
    );
    return;
  }

  await drawShareWebCard(
    canvas,
    {
      version: SHARE_WEB_VERSIONS[0],
      ratio: input.ratio,
      mode: input.mode,
      locale: input.locale,
      timeZone: input.timeZone,
      now: input.now,
      reset: input.reset,
      metrics: input.metrics,
      heatmapResets: input.heatmapResets,
      trackingStartedAt: input.trackingStartedAt,
    },
    isCurrent,
  );
}

/**
 * Exports a rendered canvas to a PNG Blob locally without any server request.
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode PNG blob from canvas."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
