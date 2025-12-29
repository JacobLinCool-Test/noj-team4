'use client';

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourse } from "@/contexts/CourseContext";
import { useCourseAnnouncements } from "@/hooks/useCourseAnnouncements";
import { useCourseHomeworks } from "@/hooks/useCourseHomeworks";
import { useCourseProblems } from "@/hooks/useCourseProblems";
import { StatsCard, StatsCardSkeleton } from "./stats-card";
import { ProblemCard, ProblemCardSkeleton } from "./problem-card";
import { CourseLeaveButton } from "./course-leave-button";
import type { Announcement } from "@/types/announcement";
import type { HomeworkListItem, HomeworkStatus } from "@/types/homework";

const STATUS_STYLES: Record<HomeworkStatus, { bg: string; text: string; dot: string }> = {
  UPCOMING: { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  ONGOING: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  ENDED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

const STATUS_LABELS: Record<HomeworkStatus, string> = {
  UPCOMING: "即將開始",
  ONGOING: "進行中",
  ENDED: "已結束",
};

export function CourseOverview() {
  const { messages, locale } = useI18n();
  const { accessToken } = useAuth();
  const { course, isMember, setCourse } = useCourse();

  // Fetch announcements
  const {
    data: announcements,
    loading: announcementsLoading,
  } = useCourseAnnouncements(course?.slug ?? "", accessToken, { enabled: isMember });

  // Fetch homeworks
  const {
    data: homeworks,
    loading: homeworksLoading,
  } = useCourseHomeworks(isMember && course?.slug ? course.slug : null, accessToken);

  // Fetch problems
  const {
    data: problemsData,
    loading: problemsLoading,
  } = useCourseProblems({
    courseSlug: course?.slug ?? "",
    page: 1,
    pageSize: 8,
    accessToken,
  });

  const topAnnouncements: Announcement[] = (announcements ?? []).slice(0, 3);
  const topHomeworks: HomeworkListItem[] = (homeworks ?? [])
    .filter((hw) => hw.status !== "ENDED")
    .slice(0, 3);
  const recentProblems = problemsData?.items.slice(0, 8) ?? [];

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "已過期";
    if (diffDays === 0) return "今天截止";
    if (diffDays === 1) return "明天截止";
    if (diffDays <= 7) return `${diffDays} 天後截止`;
    return date.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US");
  };

  // Layout should handle loading state, but be defensive
  if (!course) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {messages.courseDetailSummary ?? "課程統計"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label={messages.courseStatMembers ?? "成員"}
            value={course.memberCount}
            color="sky"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatsCard
            label={messages.courseStatHomeworks ?? "作業"}
            value={course.homeworkCount}
            color="emerald"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
          <StatsCard
            label={messages.courseStatProblems ?? "題目"}
            value={problemsData?.total ?? 0}
            color="violet"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            label={messages.courseStatSubmissions ?? "提交"}
            value={course.submissionCount}
            color="amber"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Two Column Layout: Announcements & Upcoming Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Announcements */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              {messages.courseRecentAnnouncements ?? "最近公告"}
            </h3>
            <Link
              href={`/courses/${course.slug}/announcements`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#003865] hover:text-[#005a9e]"
            >
              {messages.courseDetailViewAll ?? "查看全部"}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {announcementsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 skeleton-shimmer" />
              ))}
            </div>
          ) : topAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-8 text-center">
              <svg className="mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <p className="text-sm text-slate-500">目前沒有公告</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {topAnnouncements.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/courses/${course.slug}/announcements/${a.id}`}
                    className="group block rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-[#003865]/20 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {a.isPinned && (
                        <span className="mt-0.5 text-amber-500">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 group-hover:text-[#003865] truncate">
                          {a.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {a.author.nickname ?? a.author.username} · {new Date(a.createdAt).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US")}
                        </p>
                      </div>
                      <svg className="h-5 w-5 text-slate-300 group-hover:text-[#003865] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming Deadlines */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {messages.courseUpcomingDeadlines ?? "即將截止"}
            </h3>
            <Link
              href={`/courses/${course.slug}/homeworks`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#003865] hover:text-[#005a9e]"
            >
              {messages.courseDetailViewAll ?? "查看全部"}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {homeworksLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 skeleton-shimmer" />
              ))}
            </div>
          ) : topHomeworks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-8 text-center">
              <svg className="mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-sm text-slate-500">沒有即將截止的作業</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {topHomeworks.map((hw) => {
                const statusStyle = STATUS_STYLES[hw.status];
                return (
                  <li key={hw.id}>
                    <Link
                      href={`/courses/${course.slug}/homeworks/${hw.id}`}
                      className="group block rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-[#003865]/20 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 group-hover:text-[#003865] truncate">
                            {hw.title}
                          </h4>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              {hw.problemCount} 題
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatRelativeTime(hw.endAt)}
                            </span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {STATUS_LABELS[hw.status]}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Recent Problems */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {messages.courseRecentProblems ?? "課程題目"}
          </h2>
          <Link
            href={`/courses/${course.slug}/problems`}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#003865] hover:text-[#005a9e]"
          >
            {messages.courseDetailViewAll ?? "查看全部"}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {problemsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProblemCardSkeleton key={i} />
            ))}
          </div>
        ) : recentProblems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <svg className="mb-3 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500">目前沒有題目</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                displayId={problem.displayId}
                title={problem.title}
                difficulty={problem.difficulty}
                tags={problem.tags}
                courseSlug={course.slug}
                createdAt={problem.createdAt}
              />
            ))}
          </div>
        )}
      </section>

      {/* Leave Course Button */}
      <div className="flex justify-center pt-4">
        <CourseLeaveButton
          courseSlug={course.slug}
          myRole={course.myRole}
          accessToken={accessToken}
          onLeft={(detail) => setCourse(detail)}
        />
      </div>
    </div>
  );
}
