import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LOCALE_COOKIE, normalizeLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/providers/AuthProvider";
import { PreferencesProvider } from "@/providers/PreferencesProvider";
import { GlobalAiAssistant } from "@/components/global-ai-assistant";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NOJ Team4",
    template: "%s - NOJ Team4",
  },
  description:
    "NOJ-Team4：Next.js + NestJS 打造的線上解題與課程平台，支援 AI 助教與 LeetCode 式測試。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const localeMessages = messages[locale];

  return (
    <html lang={locale}>
      <body className="antialiased">
        <AuthProvider>
          <PreferencesProvider>
            <I18nProvider locale={locale} messages={localeMessages}>
              <div className="flex min-h-screen flex-col bg-white text-gray-900">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <GlobalAiAssistant />
            </I18nProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
