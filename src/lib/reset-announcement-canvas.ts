"use client";

import { siteConfig } from "@/config/site";
import { formatTimestamp } from "./datetime";
import { ANNOUNCEMENT_PLATFORM, type ResetDesign } from "./reset-announcement";
import { wrapTextLines } from "./share-card-layout";
import {
  SHARE_CARD_DIMENSIONS,
  VARUN_AVATAR_PUBLIC_PATH,
  type ShareCardRatio,
} from "./share-params";
import { getSiteDisplayHost } from "./site-url";
import type { Locale, ResetEvidence } from "./types";

export const DEMO_RESET_AT = "2026-11-27T05:00:00.000Z";

const COLORS = {
  ink: "#111111",
  inkMuted: "#52525B",
  inkSoft: "#71717A",
  paper: "#FDF8EE",
  surface: "#FFFFFF",
  geminiBlue: "#2563EB",
  geminiTint: "#EFF6FF",
  xVerifiedBlue: "#1D9BF0",
} as const;

interface AnnouncementImage {
  design: ResetDesign;
  ratio: ShareCardRatio;
  locale: Locale;
  timeZone: string;
  reset: ResetEvidence | null;
  demoTweetText?: string;
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadOptionalImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }

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

function fitHeadline(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  maxWidth: number,
  sans: string,
) {
  ctx.save();
  ctx.textBaseline = "alphabetic";
  let fontSize = 132;
  ctx.font = `800 ${fontSize}px ${sans}`;
  while (fontSize > 84 && lines.some((line) => ctx.measureText(line).width > maxWidth)) {
    fontSize -= 3;
    ctx.font = `800 ${fontSize}px ${sans}`;
  }
  const metrics = lines.map((line) => ctx.measureText(line));
  const ascent = Math.ceil(metrics[0].actualBoundingBoxAscent);
  const descent = Math.ceil(metrics[metrics.length - 1].actualBoundingBoxDescent);
  const lineHeight = Math.round(fontSize * 1.04);
  const font = ctx.font;
  ctx.restore();

  return { font, lineHeight, ascent, height: ascent + (lines.length - 1) * lineHeight + descent };
}

export async function drawResetAnnouncement(
  canvas: HTMLCanvasElement,
  { design, ratio, locale, timeZone, reset, demoTweetText }: AnnouncementImage,
  isCurrent: () => boolean,
): Promise<void> {
  await document.fonts.ready;
  const [avatarImg, brandIcon] = await Promise.all([
    loadOptionalImage(VARUN_AVATAR_PUBLIC_PATH),
    loadOptionalImage("/icon.png"),
  ]);
  if (!isCurrent()) return;

  const { width, height } = SHARE_CARD_DIMENSIONS[ratio];
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

  const demo = !reset;
  const date = formatTimestamp(
    reset?.resetAt ?? DEMO_RESET_AT,
    locale,
    timeZone,
  );
  const displayHost = getSiteDisplayHost();

  // 1. Clean flat Gemini Tint background
  ctx.fillStyle = COLORS.geminiTint;
  ctx.fillRect(0, 0, width, height);

  const colX = 68;
  const colW = width - colX * 2;
  const contentX = colX + 54;
  const brandY = 54;
  const heroY = 148;
  const platformY = heroY + 48;
  const headlineTop = platformY + 46;
  const headline = design.headline[locale];
  const title = fitHeadline(ctx, headline, colW - 108, sans);
  const ctaY = headlineTop + title.height + 48;
  const ctaH = 108;
  const dateY = ctaY + ctaH + 40;
  const heroBottom = dateY + 27 + 44;
  const quoteY = heroBottom + 36;
  const quoteH = 226;
  const footerY = quoteY + quoteH + 30;
  const footerH = 74;

  const safeTop = ratio === "9x16" ? 250 : 0;
  const safeBottom = ratio === "9x16" ? 310 : 0;
  const contentHeight = footerY + footerH - brandY;
  const contentTop = safeTop + Math.round((height - safeTop - safeBottom - contentHeight) / 2);
  ctx.save();
  ctx.translate(0, contentTop - brandY);

  // 2. Clean Brand Header (y = 54..110)
  const tileSize = 56;
  drawPanel(ctx, {
    x: colX,
    y: 54,
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
    roundedRectPath(ctx, colX + 6, 60, tileSize - 12, tileSize - 12, 8);
    ctx.clip();
    ctx.drawImage(brandIcon, colX + 6, 60, tileSize - 12, tileSize - 12);
    ctx.restore();
  }

  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 32px ${sans}`;
  ctx.fillText(siteConfig.name, colX + tileSize + 16, 54);

  const brandSubtitle =
    locale === "id"
      ? "Pantau reset kuota Antigravity"
      : "Track Antigravity quota resets";
  ctx.fillStyle = COLORS.inkMuted;
  ctx.font = `600 18px ${sans}`;
  ctx.fillText(brandSubtitle, colX + tileSize + 16, 90);
  ctx.textBaseline = "middle";

  if (demo) {
    const badgeText = "DEMO";
    ctx.font = `700 16px ${mono}`;
    const badgeW = Math.ceil(ctx.measureText(badgeText).width + 38);
    const badgeH = 44;
    const badgeX = colX + colW - badgeW;
    const badgeY = 60;

    drawPanel(ctx, {
      x: badgeX,
      y: badgeY,
      w: badgeW,
      h: badgeH,
      r: 10,
      fill: COLORS.paper,
      stroke: COLORS.ink,
      strokeWidth: 3,
      shadow: 4,
    });

    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
    ctx.textAlign = "left";
  }
  ctx.textBaseline = "top";

  // 3. Main hero card
  drawPanel(ctx, {
    x: colX,
    y: heroY,
    w: colW,
    h: heroBottom - heroY,
    r: 24,
    fill: COLORS.surface,
    stroke: COLORS.ink,
    strokeWidth: 4,
    shadow: 10,
  });

  ctx.fillStyle = COLORS.geminiBlue;
  ctx.font = `700 22px ${mono}`;
  ctx.fillText(ANNOUNCEMENT_PLATFORM.toUpperCase(), contentX, platformY);

  ctx.fillStyle = COLORS.ink;
  ctx.font = title.font;
  ctx.textBaseline = "alphabetic";
  headline.forEach((line, index) => {
    ctx.fillText(line, contentX, headlineTop + title.ascent + index * title.lineHeight);
  });

  const ctaLabel = design.cta[locale].toUpperCase();
  ctx.font = `800 44px ${mono}`;
  const ctaW = Math.ceil(ctx.measureText(ctaLabel).width + 88);
  drawPanel(ctx, {
    x: contentX,
    y: ctaY,
    w: ctaW,
    h: ctaH,
    r: 18,
    fill: COLORS.geminiBlue,
    stroke: COLORS.ink,
    strokeWidth: 4,
    shadow: 9,
  });
  ctx.fillStyle = COLORS.surface;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaLabel, contentX + ctaW / 2, ctaY + ctaH / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.fillStyle = COLORS.inkMuted;
  ctx.font = `700 27px ${mono}`;
  ctx.fillText(date, contentX, dateY);

  // 4. X post excerpt
  drawPanel(ctx, {
    x: colX,
    y: quoteY,
    w: colW,
    h: quoteH,
    r: 22,
    fill: COLORS.surface,
    stroke: COLORS.ink,
    strokeWidth: 3.5,
    shadow: 8,
  });

  const qPadX = 28;
  const qPadTop = 26;
  const avatarSize = 54;
  drawVarunAvatar(ctx, colX + qPadX, quoteY + qPadTop, avatarSize, avatarImg, sans);

  drawXLogo(ctx, colX + colW - qPadX - 24, quoteY + qPadTop + 6, 22);

  const authorX = colX + qPadX + avatarSize + 16;
  const authorCenterY = quoteY + qPadTop + 17;
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 22px ${sans}`;
  ctx.fillText(siteConfig.targetAccount.name, authorX, authorCenterY);
  const nameW = ctx.measureText(siteConfig.targetAccount.name).width;

  drawXVerifiedBadge(ctx, authorX + nameW + 13, authorCenterY, 10);

  const handleLabel = demo
    ? locale === "id"
      ? "@_mohansolo · contoh"
      : "@_mohansolo · sample"
    : siteConfig.targetAccount.handle;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `500 18px ${sans}`;
  ctx.fillText(handleLabel, authorX + nameW + 30, authorCenterY);

  const sampleText =
    demoTweetText?.trim() ||
    (locale === "id"
      ? "Cuplikan pengumuman kuota dari @_mohansolo akan tampil di sini."
      : "The Gemini quota announcement from @_mohansolo appears here.");
  const excerpt = reset?.tweetText.replace(/\s+/g, " ").trim();
  const quoteBody = excerpt || (demo ? sampleText : siteConfig.targetAccount.name);

  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 25px ${sans}`;
  const quoteMaxW = colX + colW - qPadX - authorX - 28;
  wrapTextLines(quoteBody, 3, quoteMaxW, (line) => ctx.measureText(line).width)
    .forEach((line, index) => {
      ctx.fillText(line, authorX, quoteY + qPadTop + 44 + index * 36);
    });

  // 5. Site footer
  drawPanel(ctx, {
    x: colX,
    y: footerY,
    w: colW,
    h: footerH,
    r: 16,
    fill: COLORS.ink,
    stroke: COLORS.ink,
    strokeWidth: 0,
    shadow: 0,
  });

  const footerMidY = footerY + footerH / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.surface;
  ctx.font = `700 22px ${mono}`;
  ctx.fillText(displayHost, colX + colW / 2, footerMidY + 0.5);
  ctx.textAlign = "left";

  ctx.restore();
}
