'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserAvatar } from "./UserAvatar";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";

export function Header() {
  const { messages } = useI18n();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [contestUrl, setContestUrl] = useState("https://contest.noj4.dev");

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isDevHost =
      hostname.startsWith("dev.") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    setContestUrl(isDevHost ? "https://contest-dev.noj4.dev" : "https://contest.noj4.dev");
  }, []);

  const navLinks = [
    { href: "/", label: messages.navHome },
    { href: "/courses", label: messages.navCourses },
    { href: "/problems", label: messages.navProblems },
  ];

  if (user) {
    navLinks.push({ href: "/submissions", label: messages.navSubmissions });
  }
  // 允許 ADMIN 或 demo-admin 帳號進入後台
  if (user?.role === "ADMIN" || user?.username === "demo-admin") {
    navLinks.push({ href: "/admin", label: messages.navAdmin });
  }

  const handleLogout = () => {
    if (window.confirm(messages.logoutConfirm)) {
      logout();
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || isMenuOpen
          ? "border-b border-gray-200 bg-white shadow-sm"
          : "border-b border-transparent bg-white"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-xl font-bold tracking-tight text-[#003865] transition hover:opacity-80"
        >
          <span>{messages.brand}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#003865]/10 text-[#003865]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-[#003865]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href={contestUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full border border-[#003865]/20 px-3 py-1.5 text-sm font-medium text-[#003865] transition hover:bg-[#003865]/10"
          >
            {messages.navContest}
          </a>
          <div className="h-4 w-px bg-gray-200" />
          <LanguageSwitcher />

          {loading && !user ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-gray-100" />
          ) : user ? (
            <div className="flex items-center gap-3 pl-2">
              <Link
                href={`/users/${user.username}`}
                className="flex items-center gap-2 rounded-full p-1 transition hover:bg-gray-100"
              >
                <UserAvatar
                  username={user.username}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                />
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold text-gray-900">
                    {user.username}
                  </span>
                  {!user.emailVerifiedAt && (
                    <span className="text-xs text-red-500">
                      {messages.goVerify}
                    </span>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={messages.logout}
                className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                title={messages.logout}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-[#003865]"
              >
                {messages.login}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#003865] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e5d8f] hover:shadow-md"
              >
                {messages.signup}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={messages.navToggleLabel}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
        >
          {isMenuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-gray-100 bg-white px-4 py-4 shadow-lg space-y-4">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-[#003865]"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={contestUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-[#003865]/20 bg-[#003865]/5 px-3 py-2 text-sm font-medium text-[#003865] transition hover:bg-[#003865]/10"
            >
              {messages.navContest}
            </a>
          </nav>

          <div className="h-px bg-gray-100" />

          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{messages.headerLanguage}</span>
                <LanguageSwitcher />
             </div>
            {user ? (
              <>
                <Link
                  href={`/users/${user.username}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <UserAvatar
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                  />
                  <div className="flex flex-1 items-center justify-between">
                    <span>{user.username}</span>
                    {!user.emailVerifiedAt && <span className="text-xs text-red-500">{messages.emailUnverified}</span>}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  {messages.logout}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {messages.login}
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-[#003865] px-3 py-2 text-center text-sm font-medium text-white shadow-sm transition hover:bg-[#1e5d8f]"
                >
                  {messages.signup}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
