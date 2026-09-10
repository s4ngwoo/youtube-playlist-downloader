import { create } from "zustand";
import { en } from "./locales/en";
import { ko } from "./locales/ko";
import { Locale, MessageCatalog, normalizeLocale } from "./types";

const catalogs: Record<Locale, MessageCatalog> = { ko, en };

type Vars = Record<string, string | number>;

type I18nState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
};

function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Vars
): string {
  const catalog = catalogs[locale] ?? catalogs.ko;
  const template = catalog[key] ?? catalogs.ko[key] ?? key;
  return format(template, vars);
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: "ko",
  setLocale: (locale) => set({ locale: normalizeLocale(locale) }),
  t: (key, vars) => translate(get().locale, key, vars),
}));

export function getLocale(): Locale {
  return useI18n.getState().locale;
}

export function t(key: string, vars?: Vars): string {
  return useI18n.getState().t(key, vars);
}
