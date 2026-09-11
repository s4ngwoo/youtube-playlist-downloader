/** Lightweight message catalog (dot keys). Values may include `{name}` placeholders. */
export type MessageCatalog = Record<string, string>;

export type { AppLocale as Locale } from "../types/settings";
export { normalizeLocale, LOCALES } from "../types/settings";
