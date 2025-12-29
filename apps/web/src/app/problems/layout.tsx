import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getServerLocaleData } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerLocaleData();

  return {
    title: messages.navProblems,
  };
}

export default function ProblemsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
