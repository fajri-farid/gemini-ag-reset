import type { Locale } from "./types";

export interface Dictionary {
  locale: Locale;
  header: {
    skipToContent: string;
    tagline: string;
    lastCheckedPrefix: string;
    checkingDelayed: string;
    neverChecked: string;
    viewProfile: string;
    languageSwitchLabel: string;
    versionBadgeContext: string;
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
    timezoneSwitchLabel: string;
    title: string;
    trackingSincePrefix: string;
    varunTimeLabel: string;
    localTimeLabel: string;
    legendReset: string;
    legendNoReset: string;
    legendBeforeTracking: string;
    legendToday: string;
    todayBadge: string;
    upcomingLabel: string;
    weekdaysShort: readonly [string, string, string, string, string, string, string];
    openTweetCta: string;
    resetsOnDayLabel: string;
    resetsCountUnit: string;
    closePopoverLabel: string;
  };
  feed: {
    title: string;
    subtitle: string;
    emptyState: string;
    viewOnX: string;
    loadMore: string;
    loadingMore: string;
    loadError: string;
  };
  footer: {
    disclaimer: string;
    builtByPrefix: string;
    languageLabel: string;
    changelogLink: string;
  };
  changelog: {
    pageTitle: string;
    subtitle: string;
    backToTracker: string;
    currentVersionPrefix: string;
    allGitHubReleases: string;
    latestBadge: string;
    releaseOnGitHubPrefix: string;
    categories: {
      added: string;
      improved: string;
      fixed: string;
    };
  };
}

const EN_DICTIONARY: Dictionary = {
  locale: "en",
  header: {
    skipToContent: "Skip to content",
    tagline:
      "We watch @_mohansolo for Gemini quota resets in Antigravity, so you don't have to.",
    lastCheckedPrefix: "Last checked:",
    checkingDelayed: "Check delayed · showing saved data",
    neverChecked: "Not checked yet",
    viewProfile: "@_mohansolo on X",
    languageSwitchLabel: "Language",
    versionBadgeContext: "View changelog",
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
    timezoneSwitchLabel: "Time zone",
    title: "Gemini reset history",
    trackingSincePrefix: "Tracking since",
    varunTimeLabel: "Varun time (PT)",
    localTimeLabel: "Local time",
    legendReset: "Reset",
    legendNoReset: "No reset",
    legendBeforeTracking: "Before tracking",
    legendToday: "Today",
    todayBadge: "Today",
    upcomingLabel: "Upcoming",
    weekdaysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    openTweetCta: "Open Tweet",
    resetsOnDayLabel: "Reset announced",
    resetsCountUnit: "resets announced",
    closePopoverLabel: "Close details",
  },
  feed: {
    title: "Gemini reset announcements",
    subtitle: "Every announcement, preserved for history",
    emptyState: "No resets recorded yet.",
    viewOnX: "View on X",
    loadMore: "Load more announcements",
    loadingMore: "Loading announcements…",
    loadError: "Couldn't load more announcements. Try again.",
  },
  footer: {
    disclaimer:
      "Data from @_mohansolo's tweets, classified by Gemini. Not affiliated with Google.",
    builtByPrefix: "Built by",
    languageLabel: "Language",
    changelogLink: "Changelog",
  },
  changelog: {
    pageTitle: "Changelog",
    subtitle: "Version history and notable updates to Gemini Resets.",
    backToTracker: "Back to tracker",
    currentVersionPrefix: "Current version:",
    allGitHubReleases: "GitHub Releases",
    latestBadge: "LATEST",
    releaseOnGitHubPrefix: "GitHub Release",
    categories: {
      added: "Added",
      improved: "Improved",
      fixed: "Fixed",
    },
  },
};

const ID_DICTIONARY: Dictionary = {
  locale: "id",
  header: {
    skipToContent: "Lewati ke konten",
    tagline:
      "Kami memantau @_mohansolo untuk pengumuman reset kuota Gemini di Antigravity, biar kamu tidak perlu cek manual.",
    lastCheckedPrefix: "Terakhir dicek:",
    checkingDelayed: "Pengecekan tertunda · menampilkan data tersimpan",
    neverChecked: "Belum pernah dicek",
    viewProfile: "@_mohansolo di X",
    languageSwitchLabel: "Bahasa",
    versionBadgeContext: "Lihat catatan rilis",
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
    timezoneSwitchLabel: "Zona waktu",
    title: "Riwayat reset Gemini",
    trackingSincePrefix: "Dipantau sejak",
    varunTimeLabel: "Waktu Varun (PT)",
    localTimeLabel: "Waktu lokal",
    legendReset: "Reset",
    legendNoReset: "Tidak ada reset",
    legendBeforeTracking: "Sebelum dipantau",
    legendToday: "Hari ini",
    todayBadge: "Hari ini",
    upcomingLabel: "Belum tiba",
    weekdaysShort: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
    openTweetCta: "Buka Tweet",
    resetsOnDayLabel: "Reset diumumkan",
    resetsCountUnit: "reset diumumkan",
    closePopoverLabel: "Tutup detail",
  },
  feed: {
    title: "Pengumuman reset Gemini",
    subtitle: "Setiap pengumuman, tersimpan rapi sebagai bukti",
    emptyState: "Belum ada reset yang tercatat.",
    viewOnX: "Lihat di X",
    loadMore: "Muat pengumuman lainnya",
    loadingMore: "Memuat pengumuman…",
    loadError: "Pengumuman gagal dimuat. Coba lagi.",
  },
  footer: {
    disclaimer:
      "Data dari tweet @_mohansolo, diklasifikasi oleh Gemini. Tidak berafiliasi dengan Google.",
    builtByPrefix: "Dibuat oleh",
    languageLabel: "Bahasa",
    changelogLink: "Catatan rilis",
  },
  changelog: {
    pageTitle: "Catatan Rilis",
    subtitle: "Riwayat versi dan pembaruan penting pada Gemini Resets.",
    backToTracker: "Kembali ke beranda",
    currentVersionPrefix: "Versi saat ini:",
    allGitHubReleases: "GitHub Releases",
    latestBadge: "TERBARU",
    releaseOnGitHubPrefix: "Rilis GitHub",
    categories: {
      added: "Baru",
      improved: "Peningkatan",
      fixed: "Perbaikan",
    },
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
