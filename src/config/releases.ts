import { siteConfig } from "@/config/site";

export const CURRENT_VERSION = "0.3.0";
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
    version: "0.3.0",
    tag: "v0.3.0",
    publishedOn: "2026-11-27",
    isLatest: true,
    content: {
      en: {
        title: "Share Reset Updates",
        summary:
          "Let friends know when Gemini quota resets in Antigravity.",
        sections: {
          added: [
            "Share from the reset status on the home page or from any announcement in the archive.",
            "Preview and download an image for a post or story. Choose the language and time zone before you share.",
            "Share an individual announcement or a summary of the reset history. You can share the image directly from supported browsers.",
            "Copy the suggested message, open it in WhatsApp, or start a draft on X or Threads.",
            "The Gemini Resets link can show the latest reset status in apps that support link previews.",
          ],
        },
      },
      id: {
        title: "Bagikan Kabar Reset",
        summary:
          "Kabari teman saat kuota Gemini di Antigravity direset.",
        sections: {
          added: [
            "Bagikan dari status reset di beranda atau dari pengumuman mana pun di arsip.",
            "Lihat pratinjau dan unduh gambar untuk unggahan atau story. Pilih bahasa dan zona waktu sebelum membagikannya.",
            "Bagikan satu pengumuman atau ringkasan riwayat reset. Di browser yang mendukung, gambar bisa langsung dibagikan.",
            "Salin pesan yang sudah disiapkan, buka di WhatsApp, atau buat draf di X maupun Threads.",
            "Tautan Gemini Resets bisa menampilkan status reset terbaru di aplikasi yang mendukung pratinjau tautan.",
          ],
        },
      },
    },
  },
  {
    version: "0.2.0",
    tag: "v0.2.0",
    publishedOn: "2026-11-27",
    content: {
      en: {
        title: "Community Notes & Site Love",
        summary:
          "Share a note with the Gemini Resets community or tap the heart to show your support.",
        sections: {
          added: [
            "Community Notes on the home page, with a shortcut to the wall on desktop and mobile.",
            "Write a note with a live preview, five designs, five colors or a random color, and an optional mood.",
            "Browse the full notes archive and filter by mood or Loved by maker.",
            "Tap the Site Love heart to show your support without signing in.",
          ],
        },
      },
      id: {
        title: "Catatan Komunitas & Tombol Love",
        summary:
          "Tulis catatan untuk komunitas Gemini Resets atau ketuk tombol hati untuk memberi dukungan.",
        sections: {
          added: [
            "Catatan Komunitas di beranda, dengan pintasan ke dinding catatan di desktop dan ponsel.",
            "Tulis catatan dengan pratinjau langsung, lima desain, lima warna atau pilihan acak, dan suasana hati opsional.",
            "Jelajahi arsip catatan dan saring berdasarkan suasana hati atau Disukai pembuat.",
            "Ketuk tombol Love untuk memberi dukungan tanpa login.",
          ],
        },
      },
    },
  },
  {
    version: "0.1.0",
    tag: "v0.1.0",
    publishedOn: "2026-11-27",
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
