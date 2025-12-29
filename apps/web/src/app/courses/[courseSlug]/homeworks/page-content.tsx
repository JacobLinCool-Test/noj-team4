'use client';

import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourse } from "@/contexts/CourseContext";
import { useCourseHomeworks } from "@/hooks/useCourseHomeworks";
import type { HomeworkStatus } from "@/types/homework";

type Props = {
  courseSlug: string;
};

const STATUS_CONFIG: Record<HomeworkStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  borderColor: string;
  iconBg: string;
}> = {
  UPCOMING: {
    label: "即將開始",
    bgColor: "bg-sky-50",
    textColor: "text-sky-700",
    dotColor: "bg-sky-500",
    borderColor: "border-sky-200",
    iconBg: "bg-sky-100",
  },
  ONGOING: {
    label: "進行中",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    dotColor: "bg-emerald-500",
    borderColor: "border-emerald-200",
    iconBg: "bg-emerald-100",
  },
  ENDED: {
    label: "已結束",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
    dotColor: "bg-slate-400",
    borderColor: "border-slate-200",
    iconBg: "bg-slate-100",
  },
};

export function HomeworksPageContent({ courseSlug }: Props) {
  const { messages, locale } = useI18n();
  const { accessToken } = useAuth();
  const { course, isMember, isStaff } = useCourse();

  const {
    data,
    loading,
    error,
    refetch,
  } = useCourseHomeworks(courseSlug, accessToken);

  const formatDeadline = (endAt: string) => {
    const end = new Date(endAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return "已截止";
    if (diffDays === 0) return "今天截止";
    if (diffDays === 1) return "明天截止";
    if (diffDays <= 7) return `${diffDays} 天後截止`;
    return end.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
      month: "short",
      day: "numeric",
    }) + " 截止";
  };

  const formatDateRange = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const localeStr = locale === "zh-TW" ? "zh-TW" : "en-US";
    return `${start.toLocaleDateString(localeStr, options)} ~ ${end.toLocaleDateString(localeStr, options)}`;
  };

  const getProgressColor = (completed: number, total: number) => {
    if (total === 0) return "bg-slate-200";
    const ratio = completed / total;
    if (ratio === 1) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-sky-500";
    return "bg-amber-500";
  };

  // Loading skeleton
  if (loading && (!data || data.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 rounded-lg bg-slate-200 skeleton-shimmer" />
          <div className="h-10 w-28 rounded-lg bg-slate-200 skeleton-shimmer" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="h-6 w-1/2 rounded bg-slate-100 skeleton-shimmer" />
              <div className="mt-4 h-4 w-3/4 rounded bg-slate-100 skeleton-shimmer" />
              <div className="mt-4 h-2 w-full rounded-full bg-slate-100 skeleton-shimmer" />
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
          <p className="text-rose-800 font-medium">無法載入作業列表</p>
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

  // Group homeworks by status
  const ongoingHomeworks = data?.filter((hw) => hw.status === "ONGOING") ?? [];
  const upcomingHomeworks = data?.filter((hw) => hw.status === "UPCOMING") ?? [];
  const endedHomeworks = data?.filter((hw) => hw.status === "ENDED") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            作業
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {data?.length ?? 0} 份作業
          </p>
        </div>
        {isStaff && (
          <Link
            href={`/courses/${courseSlug}/homeworks/new`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#003865]/25 transition-all hover:bg-[#002a4d] hover:shadow-xl hover:shadow-[#003865]/30"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增作業
          </Link>
        )}
      </div>

      {/* Ongoing Homeworks */}
      {ongoingHomeworks.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            進行中
          </h2>
          <div className="space-y-4">
            {ongoingHomeworks.map((hw) => {
              const config = STATUS_CONFIG[hw.status];
              const progress = hw.problemCount > 0 ? (hw.completedCount / hw.problemCount) * 100 : 0;
              const isComplete = hw.completedCount === hw.problemCount && hw.problemCount > 0;

              return (
                <Link
                  key={hw.id}
                  href={`/courses/${courseSlug}/homeworks/${hw.id}`}
                  className={`group block rounded-2xl border-2 ${config.borderColor} ${config.bgColor} p-6 transition-all hover:shadow-lg hover:shadow-emerald-100`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.textColor}`}>
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {hw.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatDateRange(hw.startAt, hw.endAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                        <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                        {formatDeadline(hw.endAt)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">完成進度</span>
                      <span className={`font-semibold ${isComplete ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {isComplete && <span className="mr-1">✓</span>}
                        {hw.completedCount}/{hw.problemCount} 題
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/80">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(hw.completedCount, hw.problemCount)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Homeworks */}
      {upcomingHomeworks.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sky-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            即將開始
          </h2>
          <div className="space-y-3">
            {upcomingHomeworks.map((hw) => {
              const config = STATUS_CONFIG[hw.status];

              return (
                <Link
                  key={hw.id}
                  href={`/courses/${courseSlug}/homeworks/${hw.id}`}
                  className={`group block rounded-2xl border ${config.borderColor} bg-white p-5 transition-all hover:border-sky-300 hover:shadow-lg hover:shadow-sky-50`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.textColor}`}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                        {hw.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {hw.problemCount} 題 · 開始於 {new Date(hw.startAt).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US")}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.bgColor} ${config.textColor}`}>
                      <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                      {config.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Ended Homeworks */}
      {endedHomeworks.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            已結束
          </h2>
          <div className="space-y-3">
            {endedHomeworks.map((hw) => {
              const isComplete = hw.completedCount === hw.problemCount && hw.problemCount > 0;

              return (
                <Link
                  key={hw.id}
                  href={`/courses/${courseSlug}/homeworks/${hw.id}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {isComplete ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                        {hw.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {hw.problemCount} 題 · 截止於 {new Date(hw.endAt).toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US")}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isComplete ? '✓ 已完成' : `${hw.completedCount}/${hw.problemCount}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!data || data.length === 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">尚無作業</h3>
          <p className="mt-2 text-slate-500">課程作業將會顯示在這裡</p>
          {isStaff && (
            <Link
              href={`/courses/${courseSlug}/homeworks/new`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增第一份作業
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
