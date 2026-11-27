"use client";

import { siteConfig } from "@/config/site";
import {
  formatDaysMetric,
  formatTimestamp,
  toDateKeyInTimeZone,
} from "./datetime";
import { buildDynamicHeatmap } from "./heatmap";
import { getDictionary } from "./i18n";
import { wrapTextLines } from "./share-card-layout";
import {
  SHARE_CARD_DIMENSIONS,
  VARUN_AVATAR_PUBLIC_PATH,
  type ShareCardRatio,
} from "./share-params";
import { getSiteDisplayHost } from "./site-url";
import type {
  DynamicHeatmapData,
  Locale,
  ResetEvidence,
  TrackerMetrics,
} from "./types";

export const SHARE_WEB_VERSIONS = [
  {
    id: "overview",
    name: { en: "Gemini Resets Tracker", id: "Kartu Tracker Gemini Resets" },
    headline: {
      en: "See when Gemini quota resets.",
      id: "Cek kapan kuota Gemini di-reset.",
    },
    subheadline: {
      en: "Auto-tracking @_mohansolo for Antigravity quota updates.",
      id: "Pantau otomatis @_mohansolo untuk update kuota Antigravity.",
    },
  },
] as const;

export type ShareWebVersion = (typeof SHARE_WEB_VERSIONS)[number];

export interface ShareWebCardInput {
  version: ShareWebVersion;
  ratio: ShareCardRatio;
  mode: "hero" | "item";
  locale: Locale;
  timeZone: string;
  now: Date;
  reset: ResetEvidence | null;
  metrics: TrackerMetrics;
  heatmapResets: readonly ResetEvidence[];
  trackingStartedAt: string;
}

const COLORS = {
  ink: "#111111",
  inkMuted: "#52525B",
  inkSoft: "#71717A",
  canvas: "#FDF8EE",
  surface: "#FFFFFF",
  surfaceMuted: "#F4EFE4",
  heatmapEmpty: "#EDE7DA",
  heatmapEmptyBorder: "#D6CFC0",
  geminiBlue: "#2563EB",
  geminiViolet: "#7C3AED",
  xVerifiedBlue: "#1D9BF0",
} as const;

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadOptionalImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    r = 22,
    fill = COLORS.surface,
    stroke = COLORS.ink,
    strokeWidth = 3.5,
    shadow = 0,
    shadowColor = COLORS.ink,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    r?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    shadow?: number;
    shadowColor?: string;
  },
) {
  if (shadow > 0) {
    ctx.save();
    roundedRectPath(ctx, x + shadow, y + shadow, w, h, r);
    ctx.fillStyle = shadowColor;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
}

function drawXVerifiedBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) {
  ctx.save();
  const petals = 8;
  ctx.beginPath();
  for (let i = 0; i < petals * 2; i += 1) {
    const angle = (i * Math.PI) / petals - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.82;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = COLORS.xVerifiedBlue;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.36, cy + radius * 0.04);
  ctx.lineTo(cx - radius * 0.08, cy + radius * 0.32);
  ctx.lineTo(cx + radius * 0.4, cy - radius * 0.28);
  ctx.strokeStyle = COLORS.surface;
  ctx.lineWidth = Math.max(2, radius * 0.2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

function drawXLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  const path = new Path2D(
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  );
  ctx.fillStyle = COLORS.ink;
  ctx.fill(path);
  ctx.restore();
}

function drawVarunAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  avatarImg: HTMLImageElement | null,
  sans: string,
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatarImg && avatarImg.naturalWidth > 0) {
    const aspect = avatarImg.naturalWidth / avatarImg.naturalHeight;
    let drawW = size;
    let drawH = size;
    let drawX = x;
    let drawY = y;
    if (aspect > 1) {
      drawW = size * aspect;
      drawX = x - (drawW - size) / 2;
    } else if (aspect < 1) {
      drawH = size / aspect;
      drawY = y - (drawH - size) / 2;
    }
    ctx.drawImage(avatarImg, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = COLORS.geminiBlue;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = COLORS.surface;
    ctx.font = `800 ${Math.round(size * 0.38)}px ${sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VM", cx, cy + 1);
    ctx.textAlign = "left";
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = COLORS.ink;
  ctx.stroke();
  ctx.restore();
}

function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    locale,
    brandIcon,
    sans,
  }: {
    x: number;
    y: number;
    locale: Locale;
    brandIcon: HTMLImageElement | null;
    sans: string;
  },
) {
  const tileSize = 56;
  drawPanel(ctx, {
    x,
    y,
    w: tileSize,
    h: tileSize,
    r: 13,
    fill: COLORS.surface,
    stroke: COLORS.ink,
    strokeWidth: 3,
    shadow: 4,
  });

  if (brandIcon) {
    ctx.save();
    roundedRectPath(ctx, x + 6, y + 6, tileSize - 12, tileSize - 12, 8);
    ctx.clip();
    ctx.drawImage(brandIcon, x + 6, y + 6, tileSize - 12, tileSize - 12);
    ctx.restore();
  }

  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 32px ${sans}`;
  ctx.fillText(siteConfig.name, x + tileSize + 16, y);

  const subtitle =
    locale === "id"
      ? "Pantau reset kuota Antigravity"
      : "Track Antigravity quota resets";
  ctx.fillStyle = COLORS.inkMuted;
  ctx.font = `600 18px ${sans}`;
  ctx.fillText(subtitle, x + tileSize + 16, y + 36);
}

function drawFittedHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  {
    x,
    y,
    maxWidth,
    startSize,
    minSize,
    sans,
  }: {
    x: number;
    y: number;
    maxWidth: number;
    startSize: number;
    minSize: number;
    sans: string;
  },
): number {
  let fontSize = startSize;
  ctx.font = `800 ${fontSize}px ${sans}`;
  while (fontSize > minSize && ctx.measureText(text).width > maxWidth) {
    fontSize -= 2;
    ctx.font = `800 ${fontSize}px ${sans}`;
  }

  ctx.fillStyle = COLORS.ink;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
  return fontSize;
}

function drawMetricsRow(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    metrics,
    locale,
    sans,
    mono,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    metrics: TrackerMetrics;
    locale: Locale;
    sans: string;
    mono: string;
  },
) {
  const gap = 20;
  const cardW = Math.floor((w - gap * 2) / 3);
  const items = [
    {
      label: locale === "id" ? "TOTAL RESET" : "RESETS",
      value: String(metrics.total),
      accent: COLORS.geminiBlue,
    },
    {
      label: locale === "id" ? "RATA-RATA JEDA" : "AVG. INTERVAL",
      value: formatDaysMetric(metrics.avgIntervalDays, locale),
      accent: COLORS.geminiViolet,
    },
    {
      label: locale === "id" ? "JEDA TERLAMA" : "LONGEST WAIT",
      value: formatDaysMetric(metrics.longestWaitDays, locale),
      accent: COLORS.ink,
    },
  ];

  items.forEach((item, index) => {
    const cx = x + index * (cardW + gap);
    drawPanel(ctx, {
      x: cx,
      y,
      w: cardW,
      h,
      r: 20,
      fill: COLORS.surface,
      stroke: COLORS.ink,
      strokeWidth: 3.5,
      shadow: 7,
    });

    ctx.textBaseline = "top";
    ctx.fillStyle = COLORS.inkMuted;
    ctx.font = `700 14px ${mono}`;
    ctx.fillText(item.label, cx + 24, y + 22);

    ctx.fillStyle = item.accent;
    ctx.font = `800 46px ${sans}`;
    ctx.fillText(item.value, cx + 24, y + 54);
  });
}

function drawHeatmapCard(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    heatmap,
    highlightedDateKey,
    locale,
    mono,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    heatmap: DynamicHeatmapData;
    highlightedDateKey: string | null;
    locale: Locale;
    mono: string;
  },
) {
  const dict = getDictionary(locale);
  drawPanel(ctx, {
    x,
    y,
    w,
    h,
    r: 22,
    fill: COLORS.surface,
    stroke: COLORS.ink,
    strokeWidth: 3.5,
    shadow: 8,
  });

  const padX = 28;
  const headerY = y + 28;
  const title = locale === "id" ? "RIWAYAT RESET" : "RESET HISTORY";
  const noResetLegend = locale === "id" ? "Tidak ada" : "No reset";
  const resetLegend = "Reset";

  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 15px ${mono}`;
  ctx.fillText(title, x + padX, headerY);

  // Clean 2-item legend on right
  ctx.font = `700 13px ${mono}`;
  const noResetW = ctx.measureText(noResetLegend).width;
  const resetW = ctx.measureText(resetLegend).width;

  const noResetTextX = x + w - padX - noResetW;
  ctx.fillStyle = COLORS.inkMuted;
  ctx.fillText(noResetLegend, noResetTextX, headerY);
  drawPanel(ctx, {
    x: noResetTextX - 22,
    y: headerY - 8,
    w: 16,
    h: 16,
    r: 4,
    fill: COLORS.heatmapEmpty,
    stroke: COLORS.heatmapEmptyBorder,
    strokeWidth: 1.8,
  });

  const resetTextX = noResetTextX - 36 - resetW;
  ctx.fillStyle = COLORS.inkMuted;
  ctx.fillText(resetLegend, resetTextX, headerY);
  drawPanel(ctx, {
    x: resetTextX - 22,
    y: headerY - 8,
    w: 16,
    h: 16,
    r: 4,
    fill: COLORS.geminiBlue,
    stroke: COLORS.ink,
    strokeWidth: 2,
  });

  // Dense GitHub-style 24-week grid centered cleanly inside the card
  const weekdayLabels = dict.heatmap.weekdaysShort;
  const weeks = heatmap.weeks;
  const colCount = Math.max(1, weeks.length);
  const cellSize = 27;
  const colGap = 7;
  const rowGap = 7;
  const gridWidth = colCount * cellSize + (colCount - 1) * colGap;
  const gridHeight = 7 * cellSize + 6 * rowGap;
  const weekdayColW = 44;
  const totalBlockW = weekdayColW + gridWidth;
  const blockLeft = Math.round(x + (w - totalBlockW) / 2);
  const gridLeft = blockLeft + weekdayColW;

  const innerTop = y + 54;
  const innerBottom = y + h - 22;
  const gridTop = Math.round(
    innerTop + 26 + Math.max(0, (innerBottom - innerTop - 26 - gridHeight) / 2),
  );
  const monthRowY = gridTop - 24;

  ctx.textBaseline = "middle";
  ctx.font = `700 12px ${mono}`;
  ctx.fillStyle = COLORS.inkSoft;
  for (const rowIndex of [0, 2, 4, 6]) {
    const cy = gridTop + rowIndex * (cellSize + rowGap) + cellSize / 2;
    ctx.fillText(weekdayLabels[rowIndex], blockLeft, cy);
  }

  let lastMonthRight = -Infinity;
  weeks.forEach((week, weekIdx) => {
    const colX = gridLeft + weekIdx * (cellSize + colGap);
    if (week.monthLabel) {
      ctx.fillStyle = COLORS.inkMuted;
      ctx.font = `700 13px ${mono}`;
      ctx.textBaseline = "top";
      if (colX >= lastMonthRight + 10) {
        ctx.fillText(week.monthLabel, colX, monthRowY);
        lastMonthRight = colX + ctx.measureText(week.monthLabel).width;
      }
    }

    week.cells.forEach((cell, dayIdx) => {
      const cy = gridTop + dayIdx * (cellSize + rowGap);
      const isHighlighted =
        cell.hasReset && highlightedDateKey === cell.dateKey;

      let fill: string = COLORS.surfaceMuted;
      let stroke: string = COLORS.heatmapEmpty;
      let strokeWidth = 1.4;
      let alpha = 0.5;

      if (isHighlighted || cell.hasReset) {
        fill = COLORS.geminiBlue;
        stroke = COLORS.ink;
        strokeWidth = isHighlighted ? 2.6 : 2;
        alpha = 1;
      } else if (cell.inTrackingRange) {
        fill = COLORS.heatmapEmpty;
        stroke = COLORS.heatmapEmptyBorder;
        strokeWidth = 1.5;
        alpha = 1;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      drawPanel(ctx, {
        x: colX,
        y: cy,
        w: cellSize,
        h: cellSize,
        r: 6,
        fill,
        stroke,
        strokeWidth,
      });
      ctx.restore();
    });
  });

  ctx.textBaseline = "top";
}

function drawXTweetCard(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    reset,
    locale,
    avatarImg,
    sans,
    mono,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    reset: ResetEvidence | null;
    locale: Locale;
    avatarImg: HTMLImageElement | null;
    sans: string;
    mono: string;
  },
) {
  const dict = getDictionary(locale);
  drawPanel(ctx, {
    x,
    y,
    w,
    h,
    r: 22,
    fill: COLORS.surface,
    stroke: COLORS.ink,
    strokeWidth: 3.5,
    shadow: 8,
  });

  const padX = 28;
  const padTop = 26;
  const avatarSize = 54;
  drawVarunAvatar(ctx, x + padX, y + padTop, avatarSize, avatarImg, sans);
  drawXLogo(ctx, x + w - padX - 22, y + padTop + 6, 22);

  const authorX = x + padX + avatarSize + 16;
  const headerCenterY = y + padTop + 17;
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 22px ${sans}`;
  ctx.fillText(siteConfig.targetAccount.name, authorX, headerCenterY);
  const nameW = ctx.measureText(siteConfig.targetAccount.name).width;

  drawXVerifiedBadge(ctx, authorX + nameW + 13, headerCenterY, 10);

  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `500 18px ${sans}`;
  ctx.fillText(
    siteConfig.targetAccount.handle,
    authorX + nameW + 30,
    headerCenterY,
  );

  const bodyText =
    reset?.tweetText.trim() ||
    (locale === "id"
      ? "Pengumuman reset terbaru dari @_mohansolo tampil di sini."
      : dict.hero.emptyDescription);

  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 25px ${sans}`;
  const bodyMaxW = x + w - padX - authorX - 24;
  wrapTextLines(bodyText, 5, bodyMaxW, (line) =>
    ctx.measureText(line).width,
  ).forEach((line, index) => {
    ctx.fillText(line, authorX, y + padTop + 44 + index * 36);
  });

  // Footer of X proof card (clean source reference — Last Reset is highlighted at top)
  const footerLineY = y + h - 52;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + padX, footerLineY);
  ctx.lineTo(x + w - padX, footerLineY);
  ctx.strokeStyle = COLORS.heatmapEmpty;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const metaY = footerLineY + 26;
  ctx.textBaseline = "middle";
  ctx.font = `700 14px ${mono}`;
  ctx.fillStyle = COLORS.inkMuted;
  const sourceCaption =
    locale === "id" ? "PENGUMUMAN TERAKHIR" : "LATEST ANNOUNCEMENT";
  ctx.fillText(sourceCaption, x + padX, metaY);

  ctx.fillStyle = COLORS.inkSoft;
  ctx.textAlign = "right";
  ctx.fillText("x.com/_mohansolo", x + w - padX, metaY);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

function drawFooterStrip(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    w,
    h,
    displayHost,
    mono,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    displayHost: string;
    mono: string;
  },
) {
  drawPanel(ctx, {
    x,
    y,
    w,
    h,
    r: 16,
    fill: COLORS.ink,
    stroke: COLORS.ink,
    strokeWidth: 0,
  });

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.surface;
  ctx.font = `700 22px ${mono}`;
  ctx.fillText(displayHost, x + w / 2, y + h / 2 + 0.5);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

export async function drawShareWebCard(
  canvas: HTMLCanvasElement,
  input: ShareWebCardInput,
  isCurrent: () => boolean,
): Promise<void> {
  await document.fonts.ready;
  const [avatarImg, brandIcon] = await Promise.all([
    loadOptionalImage(VARUN_AVATAR_PUBLIC_PATH),
    loadOptionalImage("/icon.png"),
  ]);
  if (!isCurrent()) return;

  const { width, height } = SHARE_CARD_DIMENSIONS[input.ratio];
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");
  const ctx: CanvasRenderingContext2D = context;

  const sans =
    getComputedStyle(document.body).fontFamily?.trim() ||
    getComputedStyle(canvas).fontFamily ||
    "system-ui, sans-serif";
  const monoVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-mono")
    .trim();
  const mono = monoVar ? `${monoVar}, ui-monospace, monospace` : "monospace";

  const displayHost = getSiteDisplayHost();
  const heatmap = buildDynamicHeatmap({
    resets: input.heatmapResets,
    trackingStartedAt: input.trackingStartedAt,
    timeZone: input.timeZone,
    locale: input.locale,
    now: input.now,
    maxWeeks: 24,
  });
  const highlightedDateKey = input.reset
    ? toDateKeyInTimeZone(input.reset.resetAt, input.timeZone)
    : null;

  // Flat Warm Cream canvas matching the main website
  ctx.fillStyle = COLORS.canvas;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(0, input.ratio === "9x16" ? 250 : 0);

  const colX = 64;
  const colW = width - colX * 2; // 952

  drawBrandHeader(ctx, {
    x: colX,
    y: 52,
    locale: input.locale,
    brandIcon,
    sans,
  });

  // Tracker headline and the date of the selected reset.
  const headlineSize = drawFittedHeadline(
    ctx,
    input.version.headline[input.locale],
    {
      x: colX,
      y: 134,
      maxWidth: colW,
      startSize: 60,
      minSize: 40,
      sans,
    },
  );

  const dateLabels =
    input.locale === "id"
      ? { item: "TANGGAL RESET", hero: "RESET TERAKHIR" }
      : { item: "RESET DATE", hero: "LAST RESET" };
  const resetDateLabel = dateLabels[input.mode];
  const resetDateValue = input.reset
    ? formatTimestamp(input.reset.resetAt, input.locale, input.timeZone)
    : input.locale === "id"
      ? "Belum ada data"
      : "No resets yet";

  const pillY = 134 + headlineSize + 14;
  const pillH = 52;
  ctx.font = `800 15px ${mono}`;
  const tagBoxW = Math.ceil(ctx.measureText(resetDateLabel).width + 28);
  ctx.font = `700 19px ${mono}`;
  const valueW = ctx.measureText(resetDateValue).width;
  const pillW = Math.min(colW, Math.ceil(tagBoxW + 20 + valueW + 24));

  drawPanel(ctx, {
    x: colX,
    y: pillY,
    w: pillW,
    h: pillH,
    r: 14,
    fill: "#EFF6FF",
    stroke: COLORS.ink,
    strokeWidth: 3,
    shadow: 5,
  });

  // Solid Gemini Blue tag segment on left of pill
  drawPanel(ctx, {
    x: colX + 6,
    y: pillY + 6,
    w: tagBoxW,
    h: pillH - 12,
    r: 9,
    fill: COLORS.geminiBlue,
    stroke: COLORS.ink,
    strokeWidth: 2,
  });

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.surface;
  ctx.font = `800 15px ${mono}`;
  ctx.fillText(resetDateLabel, colX + 6 + tagBoxW / 2, pillY + pillH / 2 + 0.5);

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 19px ${mono}`;
  ctx.fillText(resetDateValue, colX + 6 + tagBoxW + 16, pillY + pillH / 2 + 0.5);
  ctx.textBaseline = "top";

  // 3 Concise Metrics
  drawMetricsRow(ctx, {
    x: colX,
    y: 282,
    w: colW,
    h: 132,
    metrics: input.metrics,
    locale: input.locale,
    sans,
    mono,
  });

  // 24-Week Dense GitHub-Style Heatmap
  drawHeatmapCard(ctx, {
    x: colX,
    y: 440,
    w: colW,
    h: 368,
    heatmap,
    highlightedDateKey,
    locale: input.locale,
    mono,
  });

  // Original post for the selected reset.
  drawXTweetCard(ctx, {
    x: colX,
    y: 834,
    w: colW,
    h: 350,
    reset: input.reset,
    locale: input.locale,
    avatarImg,
    sans,
    mono,
  });

  // Clean Centered Domain Footer
  drawFooterStrip(ctx, {
    x: colX,
    y: 1212,
    w: colW,
    h: 74,
    displayHost,
    mono,
  });

  ctx.restore();
}
