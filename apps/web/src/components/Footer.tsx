"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";

export function Footer() {
  const { messages } = useI18n();
  const currentYear = new Date().getFullYear();
  const copyright = messages.footerCopyright.replace("{year}", String(currentYear));

  return (
    <footer className="mt-auto bg-[#003865]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4">
          {/* Brand - Clickable link to home */}
          <Link
            href="/"
            className="text-center transition-opacity hover:opacity-80"
          >
            <h3 className="text-lg font-semibold text-white">
              {messages.footerBrand}
            </h3>
          </Link>

          {/* Legal Links */}
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/terms"
              className="text-white/70 transition-colors hover:text-white"
            >
              {messages.footerTermsOfService}
            </Link>
            <span className="text-white/40">|</span>
            <Link
              href="/privacy"
              className="text-white/70 transition-colors hover:text-white"
            >
              {messages.footerPrivacyPolicy}
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-white/60">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
