import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getServerLocaleData } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getServerLocaleData();
  const baseTitle = locale === "zh-TW" ? messages.login : messages.loginTitle;

  return {
    title: baseTitle,
  };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
