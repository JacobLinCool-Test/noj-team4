"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserRecentSubmissions } from "@/hooks/useUserRecentSubmissions";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import { UserAvatar } from "@/components/UserAvatar";

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();
  const { profile, loading, error } = useUserProfile(username);
  const { stats, loading: statsLoading } = useUserStats(username);
  const { submissions, loading: submissionsLoading } = useUserRecentSubmissions(username, 10);
  const { messages, locale } = useI18n();

  const isOwnProfile = currentUser?.username === username;

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; glow: string }> = {
      AC: { bg: "bg-emerald-500", text: "text-white", glow: "shadow-emerald-500/30" },
      WA: { bg: "bg-rose-500", text: "text-white", glow: "shadow-rose-500/30" },
      TLE: { bg: "bg-amber-500", text: "text-white", glow: "shadow-amber-500/30" },
      MLE: { bg: "bg-orange-500", text: "text-white", glow: "shadow-orange-500/30" },
      CE: { bg: "bg-violet-500", text: "text-white", glow: "shadow-violet-500/30" },
      RE: { bg: "bg-pink-500", text: "text-white", glow: "shadow-pink-500/30" },
      PENDING: { bg: "bg-sky-500", text: "text-white", glow: "shadow-sky-500/30" },
      RUNNING: { bg: "bg-blue-500", text: "text-white", glow: "shadow-blue-500/30" },
    };
    return configs[status] || { bg: "bg-slate-500", text: "text-white", glow: "shadow-slate-500/30" };
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: messages.submissionStatusPending,
      RUNNING: messages.submissionStatusRunning,
      AC: messages.submissionStatusAC,
      WA: messages.submissionStatusWA,
      CE: messages.submissionStatusCE,
      TLE: messages.submissionStatusTLE,
      MLE: messages.submissionStatusMLE,
      RE: messages.submissionStatusRE,
      OLE: messages.submissionStatusOLE,
      SA: messages.submissionStatusSA,
      JUDGE_ERROR: messages.submissionStatusJudgeError,
    };
    return statusMap[status] || status;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return messages.profileTimeMinutesAgo.replace("{n}", String(diffMinutes));
      }
      return messages.profileTimeHoursAgo.replace("{n}", String(diffHours));
    } else if (diffDays < 7) {
      return messages.profileTimeDaysAgo.replace("{n}", String(diffDays));
    }
    return date.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US");
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Skeleton */}
        <div className="relative h-40 bg-gradient-to-r from-[#003865] via-[#005a9e] to-[#003865] overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.05%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
          <div className="flex flex-col items-center">
            <div className="h-32 w-32 rounded-full bg-slate-200 ring-4 ring-white shadow-xl skeleton-shimmer"></div>
            <div className="mt-5 h-7 w-48 rounded-lg bg-slate-200 skeleton-shimmer"></div>
            <div className="mt-3 h-4 w-32 rounded bg-slate-200 skeleton-shimmer"></div>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{messages.profileLoadError}</h3>
          <p className="text-sm text-slate-500 font-mono bg-slate-50 rounded-lg p-3 mt-4">{error}</p>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{messages.profileUserNotFound}</h3>
          <p className="text-slate-500">{messages.profileUserNotFoundDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-16">
      {/* Hero Section with Gradient Background - Reduced Height */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003865] via-[#005a9e] to-[#0a7bc4]"></div>

        {/* Animated Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.06%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

        {/* Decorative Circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl"></div>

        {/* Shine Effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header - Overlapping Hero */}
        <div className="relative -mt-20 sm:-mt-24">
          <div className="flex flex-col items-center">
            {/* Avatar with Glow Effect */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#003865] to-[#0a7bc4] rounded-full blur-md opacity-50 group-hover:opacity-75 transition duration-300"></div>
              <div className="relative">
                <UserAvatar
                  username={profile.username}
                  avatarUrl={profile.avatarUrl}
                  size="3xl"
                  showRing
                  ringColor="ring-white"
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              {/* Online Indicator (optional visual flair) */}
              <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full ring-4 ring-white shadow-lg"></div>
            </div>

            {/* Name & Username */}
            <div className="mt-5 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                {profile.nickname || profile.username}
              </h1>
              <p className="mt-2 text-lg text-slate-500 font-medium">@{profile.username}</p>

              {/* Join Date Badge */}
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{messages.profileJoinedAt} {formatJoinDate(profile.createdAt)}</span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-5 max-w-2xl text-center">
                <p className="text-slate-600 text-lg leading-relaxed italic">"{profile.bio}"</p>
              </div>
            )}

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/profile/edit"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#003865] to-[#005a9e] text-white font-semibold rounded-xl shadow-lg shadow-[#003865]/25 hover:shadow-xl hover:shadow-[#003865]/30 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {messages.profileEditButton}
                </Link>
                <Link
                  href={`/users/${username}/api-tokens`}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-[#003865] font-semibold rounded-xl border-2 border-[#003865]/20 hover:border-[#003865]/40 hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {messages.profileApiTokensButton}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
            {messages.profileStatsTitle}
          </h2>

          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-white shadow-sm border border-slate-100 skeleton-shimmer"></div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Submissions Card */}
              <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/10 to-transparent rounded-bl-full"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-sky-100 rounded-xl">
                      <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-500">{messages.profileStatsTotalSubmissions}</span>
                  </div>
                  <p className="text-4xl font-bold text-slate-900 tracking-tight">{stats.totalSubmissions.toLocaleString()}</p>
                </div>
              </div>

              {/* AC Count Card */}
              <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-500">{messages.profileStatsAcCount}</span>
                  </div>
                  <p className="text-4xl font-bold text-emerald-600 tracking-tight">{stats.acCount.toLocaleString()}</p>
                </div>
              </div>

              {/* Acceptance Rate Card */}
              <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-violet-100 rounded-xl">
                      <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-500">{messages.profileStatsAcceptanceRate}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-bold text-violet-600 tracking-tight">{stats.acceptanceRate}</p>
                    <span className="text-xl font-semibold text-violet-400">%</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500"
                      style={{ width: `${stats.acceptanceRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
              <p className="text-slate-500">{messages.profileRecentSubmissionsEmpty}</p>
            </div>
          )}
        </div>

        {/* Recent Submissions Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {messages.profileRecentSubmissionsTitle}
            </h2>
            {isOwnProfile && (
              <Link
                href="/submissions"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#003865] hover:text-[#005a9e] transition-colors"
              >
                {messages.profileRecentSubmissionsViewAll}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {submissionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-white border border-slate-100 shadow-sm skeleton-shimmer"></div>
              ))}
            </div>
          ) : submissions.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
              {submissions.map((submission, index) => {
                const statusConfig = getStatusConfig(submission.status);
                return (
                  <Link
                    key={submission.id}
                    href={`/submissions/${submission.id}`}
                    className="group flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/80 transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Problem Number Badge */}
                      <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-slate-100 rounded-xl text-slate-600 font-bold text-sm group-hover:bg-[#003865] group-hover:text-white transition-colors duration-200">
                        {submission.problem.displayId}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="sm:hidden text-xs font-semibold text-[#003865] bg-[#003865]/10 px-2 py-0.5 rounded">
                            {submission.problem.displayId}
                          </span>
                          <h4 className="font-semibold text-slate-900 truncate group-hover:text-[#003865] transition-colors">
                            {submission.problem.title}
                          </h4>
                        </div>
                        <p className="mt-1 text-sm text-slate-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatRelativeTime(submission.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${statusConfig.bg} ${statusConfig.text} shadow-md ${statusConfig.glow}`}>
                        {getStatusLabel(submission.status)}
                      </span>

                      {/* Arrow Icon */}
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-[#003865] group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">{messages.profileRecentSubmissionsEmpty}</p>
              <p className="mt-1 text-sm text-slate-400">{messages.profileStartSolvingHint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
