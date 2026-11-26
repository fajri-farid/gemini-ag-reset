import type { Locale } from "./types";

export interface Dictionary {
  locale: Locale;
  header: {
    tagline: string;
    lastCheckedPrefix: string;
    checkingDelayed: string;
    neverChecked: string;
    viewProfile: string;
    languageSwitchLabel: string;
  };
  hero: {
    resetRecentlyBadge: string;
    waitingBadge: string;
    emptyBadge: string;
    emptyTitle: string;
    emptyDescription: string;
    viewTweetCta: string;
    viewLastTweetCta: string;
    noSummaryFallback: string;
  };
  metrics: {
    totalResets: string;
    avgInterval: string;
    longestWait: string;
  };
  heatmap: {
    title: string;
    trackingSincePrefix: string;
    varunTimeLabel: string;
    localTimeLabel: string;
    legendReset: string;
    legendNoReset: string;
    weekdaysShort: readonly [string, string, string, string, string, string, string];
    openTweetCta: string;
    resetsOnDayLabel: string;
    closePopoverLabel: string;
  };
  feed: {
    title: string;
    subtitle: string;
    emptyState: string;
    viewOnX: string;
  };
  footer: {
    disclaimer: string;
    builtByPrefix: string;
    languageLabel: string;
  };
}

const EN_DICTIONARY: Dictionary = {
  locale: "en",
  header: {
    tagline:
      "We watch @_mohansolo for Gemini reset announcements, so you don't have to.",
    lastCheckedPrefix: "Last checked:",
    checkingDelayed: "Check delayed · showing saved data",
    neverChecked: "Not checked yet",
    viewProfile: "@_mohansolo on X",
    languageSwitchLabel: "Language",
  },
  hero: {
    resetRecentlyBadge: "RESET RECENTLY",
    waitingBadge: "WAITING",
    emptyBadge: "NO DATA YET",
    emptyTitle: "No resets recorded yet",
    emptyDescription:
      "Announcements from @_mohansolo will appear here as soon as they are recorded.",
    viewTweetCta: "View Tweet on X",
    viewLastTweetCta: "View Last Reset Tweet",
    noSummaryFallback: "Gemini quota reset announced.",
  },
  metrics: {
    totalResets: "Resets",
    avgInterval: "Avg. reset interval",
    longestWait: "Longest wait",
  },
  heatmap: {
    title: "Gemini reset history",
    trackingSincePrefix: "Tracking since",
    varunTimeLabel: "Varun time (PT)",
    localTimeLabel: "Local time",
    legendReset: "Reset",
    legendNoReset: "No reset",
    weekdaysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    openTweetCta: "Open Tweet",
    resetsOnDayLabel: "Reset announced",
    closePopoverLabel: "Close details",
  },
  feed: {
    title: "Gemini reset announcements",
    subtitle: "Every announcement, preserved for history",
    emptyState: "No resets recorded yet.",
    viewOnX: "View on X",
  },
  footer: {
    disclaimer:
      "Data from @_mohansolo's tweets, classified by Gemini. Not affiliated with Google.",
    builtByPrefix: "Built by",
    languageLabel: "Language",
  },
};

const ID_DICTIONARY: Dictionary = {
  locale: "id",
  header: {
    tagline:
      "Kami memantau @_mohansolo untuk pengumuman reset Gemini, biar kamu tidak perlu cek manual.",
    lastCheckedPrefix: "Terakhir dicek:",
    checkingDelayed: "Pengecekan tertunda · menampilkan data tersimpan",
    neverChecked: "Belum pernah dicek",
    viewProfile: "@_mohansolo di X",
    languageSwitchLabel: "Bahasa",
  },
  hero: {
    resetRecentlyBadge: "BARU DI-RESET",
    waitingBadge: "MENUNGGU",
    emptyBadge: "BELUM ADA DATA",
    emptyTitle: "Belum ada reset yang tercatat",
    emptyDescription:
      "Pengumuman dari @_mohansolo akan langsung tampil di sini begitu tercatat.",
    viewTweetCta: "Lihat Tweet di X",
    viewLastTweetCta: "Lihat Tweet Reset Terakhir",
    noSummaryFallback: "Reset kuota Gemini diumumkan.",
  },
  metrics: {
    totalResets: "Total reset",
    avgInterval: "Rata-rata jeda",
    longestWait: "Penantian terlama",
  },
  heatmap: {
    title: "Riwayat reset Gemini",
    trackingSincePrefix: "Dipantau sejak",
    varunTimeLabel: "Waktu Varun (PT)",
    localTimeLabel: "Waktu lokal",
    legendReset: "Reset",
    legendNoReset: "Tidak ada reset",
    weekdaysShort: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
    openTweetCta: "Buka Tweet",
    resetsOnDayLabel: "Reset diumumkan",
    closePopoverLabel: "Tutup detail",
  },
  feed: {
    title: "Pengumuman reset Gemini",
    subtitle: "Setiap pengumuman, tersimpan rapi sebagai bukti",
    emptyState: "Belum ada reset yang tercatat.",
    viewOnX: "Lihat di X",
  },
  footer: {
    disclaimer:
      "Data dari tweet @_mohansolo, diklasifikasi oleh Gemini. Tidak berafiliasi dengan Google.",
    builtByPrefix: "Dibuat oleh",
    languageLabel: "Bahasa",
  },
};

export function parseLocale(input: string | null | undefined): Locale {
  if (!input) {
    return "en";
  }

  const normalized = input.trim().toLowerCase();
  return normalized === "id" || normalized.startsWith("id-") ? "id" : "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return locale === "id" ? ID_DICTIONARY : EN_DICTIONARY;
}
