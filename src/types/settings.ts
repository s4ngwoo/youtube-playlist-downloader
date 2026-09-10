/** App settings persisted in Tauri plugin-store (`settings.json`). */
export type AudioFormat = "m4a" | "mp3";
export type AppLocale = "ko" | "en";

export interface AppSettings {
  downloadDir: string;
  /** Parallel download workers (clamped 1–8). Default 3. */
  concurrency: number;
  /** Output audio format for yt-dlp extraction. Default m4a. */
  audioFormat: AudioFormat;
  /** UI language. Default Korean (historical primary). */
  locale: AppLocale;
}

export const DEFAULT_SETTINGS: AppSettings = {
  downloadDir: "",
  concurrency: 3,
  audioFormat: "m4a",
  locale: "ko",
};

export const MIN_CONCURRENCY = 1;
export const MAX_CONCURRENCY = 8;

export function clampConcurrency(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.concurrency;
  return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.round(value)));
}

export function normalizeAudioFormat(value: unknown): AudioFormat {
  return value === "mp3" ? "mp3" : "m4a";
}

export function normalizeLocale(value: unknown): AppLocale {
  return value === "en" ? "en" : "ko";
}
