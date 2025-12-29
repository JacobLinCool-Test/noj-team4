export const SUPPORTED_LOCALES = ["zh-TW", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-TW";
export const LOCALE_COOKIE = "locale";

export function normalizeLocale(value: string | undefined | null): Locale {
  if (SUPPORTED_LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}
