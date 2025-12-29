'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useProblems } from "@/hooks/useProblems";
import { useAcceptedProblems } from "@/hooks/useAcceptedProblems";
import type { Problem, ProblemDifficulty } from "@/lib/api/problem";
import { CityNightBackground } from "@/components/CityNightBackground";

// --- Components ---

function DifficultyBadge({ diff, label }: { diff: ProblemDifficulty; label: string }) {
  const configs: Record<ProblemDifficulty, { color: string; bg: string; dot: string; border: string }> = {
    UNKNOWN: { color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400", border: "border-gray-200" },
    EASY: { color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", border: "border-emerald-100" },
    MEDIUM: { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", border: "border-amber-100" },
    HARD: { color: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500", border: "border-rose-100" },
  };

  const style = configs[diff] || configs.UNKNOWN;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${style.border} ${style.bg} px-2.5 py-0.5 text-xs font-medium ${style.color} shadow-sm`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

function ProblemCard({
  problem,
  isSolved,
  difficultyLabel,
}: {
  problem: Problem;
  isSolved: boolean;
  difficultyLabel: string;
}) {
  return (
    <Link
      href={`/problems/${problem.displayId}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-[#003865]/10 sm:flex-row sm:items-center sm:gap-6"
    >
      {/* Decorative accent bar - always visible */}
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#003865]" />

      {/* Status & ID */}
      <div className="flex min-w-[80px] items-center gap-3">
        <div className="flex items-center justify-center">
          {isSolved ? (
             <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
               <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <polyline points="20 6 9 17 4 12" />
               </svg>
             </div>
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-gray-300" />
          )}
        </div>
        <span className="font-mono text-sm font-semibold text-gray-500 transition-colors group-hover:text-[#003865]">
          {problem.displayId}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-[#003865]">
          {problem.title}
        </h3>
        
        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {problem.tags.map(tag => (
              <span key={tag} className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Meta / Right Side */}
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <DifficultyBadge diff={problem.difficulty} label={difficultyLabel} />
        
        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 group-hover:bg-[#003865] group-hover:text-white sm:flex">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex h-28 w-full animate-pulse flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 sm:flex-row sm:items-center">
          <div className="h-10 w-10 rounded-full bg-gray-100" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-1/3 rounded bg-gray-100" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded bg-gray-50" />
              <div className="h-5 w-16 rounded bg-gray-50" />
            </div>
          </div>
          <div className="h-8 w-20 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// --- Page ---

export default function ProblemsPage() {
  const { messages } = useI18n();
  const { user, accessToken, loading: authLoading } = useAuth();
  
  // State
  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty | "">("");
  const [page, setPage] = useState(1);

  // Data Fetching
  const {
    data: publicProblems,
    total: publicTotal,
    pageSize: publicPageSize,
    loading: publicLoading,
    error: publicError,
    refetch: refetchPublic,
  } = useProblems({
    q: q.trim() || undefined,
    difficulty: difficulty || undefined,
    page,
    pageSize: 10,
    scope: "public",
  });

  const { acceptedProblemIds } = useAcceptedProblems({ accessToken, authLoading });

  // Derived
  const difficultyLabels = useMemo(() => ({
    UNKNOWN: messages.problemsDifficultyUnknown,
    EASY: messages.problemsDifficultyEasy,
    MEDIUM: messages.problemsDifficultyMedium,
    HARD: messages.problemsDifficultyHard,
  }), [messages]);

  const effectivePageSize = publicPageSize || 10;
  const totalPages = Math.max(1, Math.ceil(publicTotal / effectivePageSize));

  // Effects
  useEffect(() => {
    setPage(1);
  }, [q, difficulty]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      
      {/* Hero Section */}
      <div className="relative z-0 overflow-hidden pb-16 pt-12 shadow-xl lg:pb-24 lg:pt-16">
        {/* Dynamic City Night Background */}
        <CityNightBackground />
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                {messages.problemsTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium text-white/70 leading-relaxed drop-shadow-sm">
                {messages.problemsPublicHint}
              </p>
            </div>
            
            {user && (
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/problems/mine"
                  className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:scale-105 hover:border-white/40 hover:bg-white/20"
                >
                  <svg className="h-4 w-4 text-white transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {messages.problemsViewMine}
                </Link>
                <Link
                  href="/problems/new"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#003865] shadow-[0_18px_40px_-24px_rgba(0,56,101,0.8)] transition-all hover:scale-105 hover:shadow-[0_24px_60px_-28px_rgba(0,56,101,0.85)]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {messages.problemsNewProblem}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container with negative margin overlap */}
      <div className="relative z-10 mx-auto -mt-12 max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Floating Filter Bar */}
        <div className="mb-10 rounded-3xl bg-white p-2 shadow-2xl shadow-[#003865]/15 ring-1 ring-gray-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={messages.problemsSearchPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-2xl border-0 bg-transparent py-3.5 pl-11 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
              />
            </div>
            
            <div className="hidden h-8 w-px bg-gray-100 sm:block" />
            
            <div className="flex items-center gap-3 px-2 pb-2 sm:pb-0">
              <span className="ml-2 whitespace-nowrap text-sm font-medium text-gray-500">
                {messages.problemsFilterDifficulty}
              </span>
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty | "")}
                  className="appearance-none rounded-2xl border-0 bg-gray-50 py-2 pl-4 pr-10 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:ring-2 focus:ring-[#003865]/20 cursor-pointer"
                >
                  <option value="">{messages.problemsDifficultyAll}</option>
                  <option value="EASY">{messages.problemsDifficultyEasy}</option>
                  <option value="MEDIUM">{messages.problemsDifficultyMedium}</option>
                  <option value="HARD">{messages.problemsDifficultyHard}</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                   <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Problem List */}
        <div className="space-y-4">
          {publicLoading ? (
            <SkeletonLoader />
          ) : publicError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
              <p className="font-medium text-red-800">{messages.problemsError}</p>
              <button onClick={() => refetchPublic()} className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:shadow">
                {messages.retry}
              </button>
            </div>
          ) : !publicProblems || publicProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-16 text-center">
              <div className="mb-4 rounded-full bg-gray-50 p-4 ring-1 ring-gray-100">
                <svg className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{messages.problemsEmpty}</h3>
              <p className="mt-2 text-gray-500">{messages.problemsEmptyHint}</p>
              <button
                onClick={() => { setQ(""); setDifficulty(""); }}
                className="mt-6 text-sm font-semibold text-[#003865] hover:underline"
              >
                {messages.problemsClearFilters}
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {publicProblems.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  isSolved={acceptedProblemIds?.has(problem.id) || false}
                  difficultyLabel={difficultyLabels[problem.difficulty]}
                />
              ))}
            </div>
          )}

          {/* Modern Pagination - Always show even if publicProblems is empty or single page, to show total count context or just existence */}
          {/* User asked to show even if < 10 items. But if 0 items, we showed empty state above. If > 0 items, we show pagination. */}
          {(!publicLoading && !publicError && publicProblems && publicProblems.length > 0) && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-[#003865] hover:border-[#003865] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-gray-100">
                <span className="text-sm font-semibold text-gray-700">
                  {page}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-gray-500">
                  {totalPages}
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  ({messages.problemsTotalCount.replace("{count}", String(publicTotal))})
                </span>
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-[#003865] hover:border-[#003865] hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
