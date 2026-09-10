/** Lightweight message catalog (dot keys). Values may include `{name}` placeholders. */
export type MessageCatalog = Record<string, string>;

export type Locale = "ko" | "en";

export const LOCALES: Locale[] = ["ko", "en"];

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : "ko";
}
