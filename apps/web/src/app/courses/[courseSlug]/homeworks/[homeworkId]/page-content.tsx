'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useHomeworkDetail } from "@/hooks/useHomeworkDetail";
import { deleteCourseHomework } from "@/lib/api/homework";
import type { HomeworkStatus } from "@/types/homework";

const STATUS_CONFIG: Record<HomeworkStatus, { bg: string; text: string; dot: string; label: string }> = {
  UPCOMING: { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500", label: "即將開始" },
  ONGOING: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "進行中" },
  ENDED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "已結束" },
};

type Props = {
  courseSlug: string;
  homeworkId: string;
};

export function HomeworkDetailContent({ courseSlug, homeworkId }: Props) {
  const { messages, locale } = useI18n();
  const { accessToken, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const {
    data,
    loading,
    error,
    unauthorized,
    notFound,
    refetch,
  } = useHomeworkDetail(courseSlug, homeworkId, accessToken);

  const canManage = data?.canEdit || data?.canDelete;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "已過期";
    if (diffDays === 0) return "今天截止";
    if (diffDays === 1) return "明天截止";
    if (diffDays <= 7) return `${diffDays} 天後截止`;
    return formatDate(dateString);
  };

  const handleDelete = async () => {
    if (!data || !canManage) return;
    const confirmed = window.confirm(messages.homeworksDeleteConfirm);
    if (!confirmed) return;
    try {
      setDeleting(true);
      await deleteCourseHomework(courseSlug, homeworkId, accessToken);
      router.push(`/courses/${courseSlug}/homeworks`);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : messages.homeworksError);
    } finally {
      setDeleting(false);
    }
  };

  // Loading skeleton
  if (authLoading || (loading && !data)) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-4 w-4 rounded bg-slate-200 skeleton-shimmer" />
            <div className="h-4 w-16 rounded bg-slate-200 skeleton-shimmer" />
          </div>
          {/* Header skeleton */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-8 w-1/2 rounded bg-slate-100 skeleton-shimmer" />
            <div className="mt-4 flex gap-3">
              <div className="h-6 w-20 rounded-full bg-slate-100 skeleton-shimmer" />
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-16 rounded bg-slate-100 skeleton-shimmer" />
              <div className="mt-2 h-5 w-32 rounded bg-slate-100 skeleton-shimmer" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-16 rounded bg-slate-100 skeleton-shimmer" />
              <div className="mt-2 h-5 w-32 rounded bg-slate-100 skeleton-shimmer" />
            </div>
          </div>
          {/* Problems skeleton */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-6 w-24 rounded bg-slate-100 skeleton-shimmer" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-50 skeleton-shimmer" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{messages.courseDetailNotFound}</h3>
            <p className="mt-2 text-slate-500">該作業可能已被刪除或不存在</p>
            <Link
              href={`/courses/${courseSlug}/homeworks`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003865] px-5 py-2.5 text-sm font-medium text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回作業列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (unauthorized && !user) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-amber-900">{messages.courseDetailNotLoggedIn}</h3>
            <p className="mt-2 text-amber-700">請先登入並加入課程後，才能查看作業</p>
            <Link
              href={`/login?next=/courses/${courseSlug}/homeworks/${homeworkId}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              {messages.login}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!data) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-rose-800 font-medium">{messages.homeworksError}</p>
            {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
            <button
              type="button"
              onClick={refetch}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {messages.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[data.status];
  const completedCount = data.problems.filter((p) => p.isCompleted).length;
  const totalCount = data.problems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={`/courses/${courseSlug}`}
            className="text-slate-500 hover:text-[#003865]"
          >
            課程
          </Link>
          <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link
            href={`/courses/${courseSlug}/homeworks`}
            className="text-slate-500 hover:text-[#003865]"
          >
            作業
          </Link>
          <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium truncate max-w-[200px]">{data.title}</span>
        </nav>

        {/* Header Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{data.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                    <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </span>
                  {data.status === "ONGOING" && (
                    <span className="text-sm text-slate-500">
                      {formatRelativeTime(data.endAt)}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Link
                    href={`/courses/${courseSlug}/homeworks/${homeworkId}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {messages.homeworksEdit}
                  </Link>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {messages.homeworksDelete}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{messages.homeworksFormStartAt}</p>
                <p className="mt-0.5 font-semibold text-slate-900">{formatDate(data.startAt)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{messages.homeworksFormEndAt}</p>
                <p className="mt-0.5 font-semibold text-slate-900">{formatDate(data.endAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {messages.homeworksFormDescription}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-slate-700 leading-relaxed">{data.description}</p>
          </section>
        )}

        {/* Progress Card (for students) */}
        {!canManage && totalCount > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-[#003865]/5 to-sky-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  作業進度
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  已完成 {completedCount} / {totalCount} 題
                </p>
              </div>
              <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${
                progressPercent === 100
                  ? "bg-emerald-500 text-white"
                  : "bg-[#003865] text-white"
              }`}>
                {progressPercent}%
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent === 100 ? "bg-emerald-500" : "bg-[#003865]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Problems Section */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {messages.homeworksFormProblems}
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {totalCount} 題
              </span>
            </h3>
          </div>

          {data.problems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-slate-500">{messages.homeworksErrorsMustSelectAtLeastOneProblem}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.problems.map((p) => (
                <Link
                  key={p.problem.id}
                  href={`/courses/${courseSlug}/problems/${p.problem.displayId}?homeworkId=${data.id}`}
                  className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-sm font-semibold text-slate-600 group-hover:bg-[#003865]/10 group-hover:text-[#003865]">
                    {p.order + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {p.problem.displayId}
                      </span>
                      <span className="font-medium text-slate-900 group-hover:text-[#003865] truncate">
                        {p.problem.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {p.isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        已完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        未完成
                      </span>
                    )}
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-300 group-hover:text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 pt-2">
          <p className="text-xs text-slate-500">
            {messages.homeworksCreatedBy.replace("{name}", data.createdBy.nickname ?? data.createdBy.username)}
          </p>
          <Link
            href={`/courses/${courseSlug}/homeworks`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#003865]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回作業列表
          </Link>
        </div>
      </div>
    </div>
  );
}
