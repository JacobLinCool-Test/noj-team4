'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useCourse } from "@/contexts/CourseContext";

interface Tab {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  requiresStaff?: boolean;
  requiresTeacher?: boolean;
}

export function CourseTabs() {
  const pathname = usePathname();
  const { messages } = useI18n();
  const { course, isStaff, isTeacher, isMember } = useCourse();

  const tabs: Tab[] = useMemo(() => {
    if (!course) return [];

    const baseUrl = `/courses/${course.slug}`;

    return [
      {
        key: "overview",
        label: messages.courseTabOverview ?? "概覽",
        href: baseUrl,
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        key: "announcements",
        label: messages.courseTabAnnouncements ?? "公告",
        href: `${baseUrl}/announcements`,
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        ),
      },
      {
        key: "homeworks",
        label: messages.courseTabHomeworks ?? "作業",
        href: `${baseUrl}/homeworks`,
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
      {
        key: "problems",
        label: messages.courseTabProblems ?? "題目",
        href: `${baseUrl}/problems`,
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        key: "members",
        label: messages.courseTabMembers ?? "成員",
        href: `${baseUrl}/members`,
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        requiresStaff: true,
      },
      {
        key: "settings",
        label: messages.courseTabSettings ?? "設定",
        href: `${baseUrl}/edit`,
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        requiresTeacher: true,
      },
    ];
  }, [course, messages]);

  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (tab.requiresTeacher && !isTeacher) return false;
      if (tab.requiresStaff && !isStaff) return false;
      return true;
    });
  }, [tabs, isTeacher, isStaff]);

  const isActiveTab = (tab: Tab) => {
    if (tab.key === "overview") {
      // Overview is active only when exactly at /courses/[slug]
      return pathname === tab.href;
    }
    // Other tabs are active when pathname starts with their href
    return pathname.startsWith(tab.href);
  };

  if (!course || !isMember) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-1 overflow-x-auto scrollbar-hide" aria-label="Tabs">
          {visibleTabs.map((tab) => {
            const isActive = isActiveTab(tab);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`
                  group inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors
                  ${isActive
                    ? "border-[#003865] text-[#003865]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }
                `}
              >
                <span className={`transition-colors ${isActive ? "text-[#003865]" : "text-gray-400 group-hover:text-gray-500"}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
