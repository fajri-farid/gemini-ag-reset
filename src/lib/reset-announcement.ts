import { MS_PER_HOUR } from "./datetime";

export const ANNOUNCEMENT_WINDOW_MS = 5 * MS_PER_HOUR;

export function isFreshReset(resetAt: string, now: number): boolean {
  const age = now - Date.parse(resetAt);
  return age >= 0 && age < ANNOUNCEMENT_WINDOW_MS;
}

export const ANNOUNCEMENT_PLATFORM = "Antigravity";

export const RESET_DESIGNS = [
  {
    id: "key",
    name: { en: "Gemini Blue Card", id: "Kartu Biru Gemini" },
    headline: {
      en: ["Gemini quota", "has been reset."],
      id: ["Kuota Gemini", "sudah di-reset."],
    },
    cta: { en: "Check your quota", id: "Cek kuota kamu" },
  },
] as const;

export type ResetDesign = (typeof RESET_DESIGNS)[number];
