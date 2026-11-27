import type {
  StickyNoteColorChoice,
  StickyNoteMood,
  StickyNoteTemplate,
} from "./sticky-notes";
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
    loveButtonLabel: string;
    loveDailyLimitReached: string;
    loveSaveError: string;
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
  notes: {
    title: string;
    subtitle: string;
    emptyState: string;
    writeCta: string;
    viewAllCta: string;
    allPageTitle: string;
    allPageSubtitle: string;
    backToTracker: string;
    justPostedBadge: string;
    noteCountUnit: string;
    postedFeedback: string;
    loadMore: string;
    loadingMore: string;
    loadError: string;
    filterAll: string;
    filterLoved: string;
    filterEmpty: string;
    clearFilter: string;
    quickDockLabel: string;
    quickJumpCta: string;
    quickWriteCta: string;
    quickAllCta: string;
    pinnedBadge: string;
    lovedByMakerBadge: string;
    moods: Record<StickyNoteMood, string>;
    colors: Record<StickyNoteColorChoice, string>;
    templates: Record<StickyNoteTemplate, { label: string; short: string }>;
    dialogTitle: string;
    closeLabel: string;
    nameLabel: string;
    nameHint: string;
    namePlaceholder: string;
    nameRequiredError: string;
    nameTooLongError: string;
    messageLabel: string;
    messageHint: string;
    messagePlaceholder: string;
    messageRequiredError: string;
    messageTooLongError: string;
    urlBlockedError: string;
    rateLimitedError: string;
    moderationRejectedError: string;
    moderationBusyError: string;
    submitGenericError: string;
    moodLabel: string;
    moodOptionalHint: string;
    colorLabel: string;
    shufflePreview: string;
    templateLabel: string;
    previewLabel: string;
    previewPlaceholderName: string;
    previewPlaceholderMessage: string;
    cancelCta: string;
    submitCta: string;
    submittingCta: string;
  };
  footer: {
    disclaimer: string;
    builtByPrefix: string;
    languageLabel: string;
    notesLink: string;
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
    loveButtonLabel: "Send love",
    loveDailyLimitReached: "Daily love limit reached (50/day)",
    loveSaveError: "Could not save your likes. Try again shortly.",
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
  notes: {
    title: "Community notes",
    subtitle: "Leave a note for the maker, visible to everyone.",
    emptyState: "No notes yet. Be the first to leave one for the maker.",
    writeCta: "Write a note",
    viewAllCta: "View all notes",
    allPageTitle: "Community notes",
    allPageSubtitle: "Every sticky note left for the maker, all in one wall.",
    backToTracker: "Back to tracker",
    justPostedBadge: "Just stuck!",
    noteCountUnit: "notes",
    postedFeedback: "Stuck to the wall! Your note is live.",
    loadMore: "Load more notes",
    loadingMore: "Loading notes…",
    loadError: "Could not load more notes. Try again.",
    filterAll: "All",
    filterLoved: "Loved by maker",
    filterEmpty: "No notes match this filter yet.",
    clearFilter: "Show all notes",
    quickDockLabel: "Quick access to community notes",
    quickJumpCta: "Jump to notes",
    quickWriteCta: "Write note",
    quickAllCta: "All notes",
    pinnedBadge: "Pinned",
    lovedByMakerBadge: "Loved by maker",
    moods: {
      thanks: "Thanks",
      feedback: "Feedback",
      idea: "Idea",
      waiting: "Waiting",
      vibe: "Good vibe",
    },
    colors: {
      random: "Random",
      butter: "Butter",
      sky: "Sky",
      lavender: "Lavender",
      mint: "Mint",
      peach: "Peach",
    },
    templates: {
      "classic-tape": { label: "Tape Note", short: "Tape" },
      "lined-pad": { label: "Ruled Pad", short: "Ruled" },
      "pixel-window": { label: "Retro Window", short: "Window" },
      "ticket-stub": { label: "Pass Stub", short: "Stub" },
      "polaroid-pin": { label: "Pushpin Card", short: "Pin" },
    },
    dialogTitle: "Write a sticky note",
    closeLabel: "Close dialog",
    nameLabel: "Your name",
    nameHint: "Required · up to 32 characters",
    namePlaceholder: "e.g. Raka",
    nameRequiredError: "Please enter your name.",
    nameTooLongError: "Name must be 32 characters or fewer.",
    messageLabel: "Your note",
    messageHint: "Required · up to 240 characters, no links",
    messagePlaceholder: "Share a quick hello, feedback, or reset wish…",
    messageRequiredError: "Please write a short note.",
    messageTooLongError: "Note must be 240 characters or fewer.",
    urlBlockedError: "Links and URLs are not allowed in notes.",
    rateLimitedError: "You have posted several notes recently. Please try again later.",
    moderationRejectedError: "This note could not be posted. Please keep it friendly and spam-free.",
    moderationBusyError: "Busy right now, please try posting again in a moment.",
    submitGenericError: "Could not post your note. Please try again.",
    moodLabel: "Mood tag",
    moodOptionalHint: "Optional",
    colorLabel: "Paper color",
    shufflePreview: "Shuffle",
    templateLabel: "Note style",
    previewLabel: "Live preview",
    previewPlaceholderName: "Your name",
    previewPlaceholderMessage: "Your note preview will appear here as you type…",
    cancelCta: "Cancel",
    submitCta: "Stick to wall",
    submittingCta: "Sticking…",
  },
  footer: {
    disclaimer:
      "Data from @_mohansolo's tweets, classified by Gemini. Not affiliated with Google.",
    builtByPrefix: "Built by",
    languageLabel: "Language",
    notesLink: "Notes",
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
    loveButtonLabel: "Kirim suka",
    loveDailyLimitReached: "Batas suka harian tercapai (50/hari)",
    loveSaveError: "Suka belum tersimpan. Coba lagi sebentar.",
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
  notes: {
    title: "Catatan komunitas",
    subtitle: "Titip catatan untuk pembuatnya, bisa dibaca semua pengunjung.",
    emptyState: "Belum ada catatan. Jadilah yang pertama menitipkan pesan.",
    writeCta: "Tulis catatan",
    viewAllCta: "Lihat semua catatan",
    allPageTitle: "Catatan komunitas",
    allPageSubtitle: "Semua catatan tempel yang dititipkan untuk pembuatnya, dalam satu dinding.",
    backToTracker: "Kembali ke beranda",
    justPostedBadge: "Baru ditempel!",
    noteCountUnit: "catatan",
    postedFeedback: "Berhasil ditempel! Catatanmu sudah tampil.",
    loadMore: "Muat catatan lainnya",
    loadingMore: "Memuat catatan…",
    loadError: "Catatan gagal dimuat. Coba lagi.",
    filterAll: "Semua",
    filterLoved: "Disukai pembuat",
    filterEmpty: "Belum ada catatan untuk filter ini.",
    clearFilter: "Tampilkan semua catatan",
    quickDockLabel: "Akses cepat ke catatan komunitas",
    quickJumpCta: "Ke catatan",
    quickWriteCta: "Tulis",
    quickAllCta: "Semua",
    pinnedBadge: "Disematkan",
    lovedByMakerBadge: "Disukai pembuat",
    moods: {
      thanks: "Terima kasih",
      feedback: "Masukan",
      idea: "Ide",
      waiting: "Menunggu",
      vibe: "Semangat",
    },
    colors: {
      random: "Acak",
      butter: "Kuning Mentega",
      sky: "Biru Langit",
      lavender: "Ungu Lembut",
      mint: "Hijau Mint",
      peach: "Persik",
    },
    templates: {
      "classic-tape": { label: "Tempelan Selotip", short: "Selotip" },
      "lined-pad": { label: "Kertas Bergaris", short: "Garis" },
      "pixel-window": { label: "Jendela Retro", short: "Jendela" },
      "ticket-stub": { label: "Tiket Sobek", short: "Tiket" },
      "polaroid-pin": { label: "Kartu Pin", short: "Pin" },
    },
    dialogTitle: "Tulis catatan tempel",
    closeLabel: "Tutup dialog",
    nameLabel: "Nama kamu",
    nameHint: "Wajib · maksimal 32 karakter",
    namePlaceholder: "mis. Raka",
    nameRequiredError: "Masukkan namamu terlebih dahulu.",
    nameTooLongError: "Nama maksimal 32 karakter.",
    messageLabel: "Isi catatan",
    messageHint: "Wajib · maksimal 240 karakter, tanpa tautan",
    messagePlaceholder: "Tulis sapaan singkat, masukan, atau harapan reset…",
    messageRequiredError: "Tulis catatan singkat terlebih dahulu.",
    messageTooLongError: "Catatan maksimal 240 karakter.",
    urlBlockedError: "Tautan atau URL tidak diperbolehkan di catatan.",
    rateLimitedError: "Kamu sudah mengirim beberapa catatan baru-baru ini. Coba lagi nanti.",
    moderationRejectedError: "Catatan ini belum bisa ditampilkan. Pastikan isinya sopan dan bebas spam.",
    moderationBusyError: "Lagi sibuk, coba kirim lagi sebentar ya.",
    submitGenericError: "Catatan gagal dikirim. Coba lagi.",
    moodLabel: "Tag mood",
    moodOptionalHint: "Opsional",
    colorLabel: "Warna kertas",
    shufflePreview: "Acak lagi",
    templateLabel: "Gaya catatan",
    previewLabel: "Pratinjau langsung",
    previewPlaceholderName: "Nama kamu",
    previewPlaceholderMessage: "Pratinjau catatanmu akan muncul di sini saat kamu mengetik…",
    cancelCta: "Batal",
    submitCta: "Tempel ke dinding",
    submittingCta: "Menempelkan…",
  },
  footer: {
    disclaimer:
      "Data dari tweet @_mohansolo, diklasifikasi oleh Gemini. Tidak berafiliasi dengan Google.",
    builtByPrefix: "Dibuat oleh",
    languageLabel: "Bahasa",
    notesLink: "Catatan",
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
