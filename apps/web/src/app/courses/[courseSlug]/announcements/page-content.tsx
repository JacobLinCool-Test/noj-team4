'use client';

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourse } from "@/contexts/CourseContext";
import { useCourseAnnouncements } from "@/hooks/useCourseAnnouncements";

type Props = {
  courseSlug: string;
};

export function AnnouncementsPageContent({ courseSlug }: Props) {
  const { messages, locale } = useI18n();
  const { accessToken } = useAuth();
  const { course, isMember, isStaff } = useCourse();

  const {
    data,
    loading,
    error,
    refetch,
  } = useCourseAnnouncements(courseSlug, accessToken, { enabled: isMember });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading skeleton
  if (loading && (!data || data.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 rounded-lg bg-slate-200 skeleton-shimmer" />
          <div className="h-10 w-28 rounded-lg bg-slate-200 skeleton-shimmer" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-6 w-2/3 rounded bg-slate-100 skeleton-shimmer" />
              <div className="mt-3 h-4 w-1/3 rounded bg-slate-100 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-rose-800 font-medium">無法載入公告</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重試
          </button>
        </div>
      </div>
    );
  }

  const pinnedAnnouncements = data?.filter((a) => a.isPinned) ?? [];
  const regularAnnouncements = data?.filter((a) => !a.isPinned) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            公告
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {data?.length ?? 0} 則公告
          </p>
        </div>
        {isStaff && (
          <Link
            href={`/courses/${courseSlug}/announcements/new`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#003865]/25 transition-all hover:bg-[#002a4d] hover:shadow-xl hover:shadow-[#003865]/30"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增公告
          </Link>
        )}
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2H3a2 2 0 01-2-2V9a2 2 0 012-2h2V5z" />
            </svg>
            置頂公告
          </h2>
          <div className="space-y-3">
            {pinnedAnnouncements.map((a) => (
              <Link
                key={a.id}
                href={`/courses/${courseSlug}/announcements/${a.id}`}
                className="group relative block overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 transition-all hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100"
              >
                {/* Pin indicator */}
                <div className="absolute -right-6 -top-6 h-12 w-12 rotate-45 bg-amber-400" />
                <div className="absolute right-1 top-1">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2H3a2 2 0 01-2-2V9a2 2 0 012-2h2V5z" />
                  </svg>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                      {a.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {a.author.nickname ?? a.author.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-300 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Regular Announcements */}
      <section>
        {pinnedAnnouncements.length > 0 && regularAnnouncements.length > 0 && (
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            所有公告
          </h2>
        )}

        {regularAnnouncements.length === 0 && pinnedAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">尚無公告</h3>
            <p className="mt-2 text-slate-500">課程公告將會顯示在這裡</p>
            {isStaff && (
              <Link
                href={`/courses/${courseSlug}/announcements/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                發布第一則公告
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {regularAnnouncements.map((a) => (
              <Link
                key={a.id}
                href={`/courses/${courseSlug}/announcements/${a.id}`}
                className="group block rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-[#003865]/20 hover:shadow-lg hover:shadow-slate-100"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-[#003865]/10 group-hover:text-[#003865] transition-colors">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[#003865] transition-colors truncate">
                      {a.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {a.author.nickname ?? a.author.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-300 group-hover:text-[#003865] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
