'use client';

import { createContext, useContext, useMemo, useCallback } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages";

type I18nValue = {
  locale: Locale;
  messages: Messages;
};

export const I18nContext = createContext<I18nValue | null>(null);

type Props = {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
};

export function I18nProvider({ locale, messages, children }: Props) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  const t = useCallback(
    (key: keyof Messages) => ctx.messages[key],
    [ctx.messages]
  );

  return { locale: ctx.locale, messages: ctx.messages, t };
}
