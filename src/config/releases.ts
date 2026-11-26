import { siteConfig } from "@/config/site";

export const CURRENT_VERSION = "0.1.0";
export const CURRENT_TAG = `v${CURRENT_VERSION}`;

export type ReleaseChangeCategory = "added" | "improved" | "fixed";

export interface ReleaseLocalizedContent {
  title: string;
  summary: string;
  sections: Partial<Record<ReleaseChangeCategory, readonly string[]>>;
}

export interface ReleaseEntry {
  version: string;
  tag: string;
  publishedOn: string;
  isLatest?: boolean;
  content: {
    en: ReleaseLocalizedContent;
    id: ReleaseLocalizedContent;
  };
}

export function getGitHubReleasesIndexUrl(): string {
  return `${siteConfig.repositoryUrl}/releases`;
}

export function getGitHubReleaseUrl(tag: string): string {
  return `${siteConfig.repositoryUrl}/releases/tag/${encodeURIComponent(tag)}`;
}

export const RELEASES: readonly ReleaseEntry[] = [
  {
    version: "0.1.0",
    tag: "v0.1.0",
    publishedOn: "2026-11-27",
    isLatest: true,
    content: {
      en: {
        title: "Initial Public Release",
        summary:
          "First public release of Gemini Resets for tracking @_mohansolo Gemini quota reset announcements in Antigravity.",
        sections: {
          added: [
            "Instant status card on the home page showing whether a reset was announced within the last 24 hours (RESET RECENTLY vs WAITING), with a direct link to @_mohansolo's original post on X.",
            "Three summary metrics: total resets recorded, average interval between resets, and longest wait.",
            "52-week daily reset history heatmap starting from the active tracking date, with interactive per-day details.",
            "Chronological reset announcements archive with original post excerpts, time gaps between announcements, and pagination.",
            "Time zone toggle (Varun time (PT) vs Local time) and bilingual EN / ID interface with saved preferences.",
            "Automated hourly checks for new reset announcements with a live \"Last checked\" status indicator.",
            "Version badge and dedicated /changelog page to follow future product updates.",
          ],
        },
      },
      id: {
        title: "Rilis Publik Perdana",
        summary:
          "Rilis publik pertama Gemini Resets untuk memantau pengumuman reset kuota Gemini di Antigravity dari @_mohansolo.",
        sections: {
          added: [
            "Kartu status instan di beranda yang menampilkan apakah reset baru diumumkan dalam 24 jam terakhir (BARU DI-RESET vs MENUNGGU), lengkap dengan tautan langsung ke unggahan asli @_mohansolo di X.",
            "Tiga ringkasan metrik: total reset tercatat, rata-rata jeda antar reset, dan penantian terlama.",
            "Heatmap riwayat reset harian 52 minggu yang dimulai sejak tanggal pemantauan aktif, dengan detail interaktif per tanggal.",
            "Arsip kronologis pengumuman reset beserta cuplikan unggahan asli, jeda waktu antarpengumuman, dan pagination.",
            "Toggle zona waktu (Waktu Varun (PT) vs Waktu lokal) serta antarmuka dwibahasa EN / ID dengan preferensi tersimpan.",
            "Pemeriksaan pengumuman reset otomatis setiap jam dengan indikator status \"Terakhir dicek\" secara langsung.",
            "Penanda versi dan halaman khusus /changelog untuk mengikuti pembaruan produk berikutnya.",
          ],
        },
      },
    },
  },
];
