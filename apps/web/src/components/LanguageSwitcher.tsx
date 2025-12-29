'use client';

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { LANGUAGE_LABEL } from "@/i18n/messages";
import { useI18n } from "@/i18n/useI18n";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, messages } = useI18n();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as Locale;
    if (nextLocale === locale) return;
    persistLocale(nextLocale);
    router.refresh();
  };

  return (
    <select
      aria-label={messages.languageSelectorLabel}
      value={locale}
      onChange={handleChange}
      suppressHydrationWarning
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition hover:border-[#1e5d8f] focus:border-[#1e5d8f] focus:ring-2 focus:ring-[#1e5d8f]/30"
    >
      {SUPPORTED_LOCALES.map((item) => (
        <option key={item} value={item}>
          {LANGUAGE_LABEL[item]}
        </option>
      ))}
    </select>
  );
}
