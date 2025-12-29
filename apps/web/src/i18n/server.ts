import { cookies } from "next/headers";
import { LOCALE_COOKIE, Locale, normalizeLocale } from "./config";
import { messages, Messages } from "./messages";

export type ServerLocaleData = {
  locale: Locale;
  messages: Messages;
};

export async function getServerLocaleData(): Promise<ServerLocaleData> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: messages[locale],
  };
}
