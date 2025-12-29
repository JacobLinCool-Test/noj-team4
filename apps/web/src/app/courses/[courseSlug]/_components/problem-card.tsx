'use client';

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import type { ProblemDifficulty } from "@/lib/api/problem";

interface ProblemCardProps {
  displayId: string;
  title: string;
  difficulty: ProblemDifficulty;
  tags?: string[];
  courseSlug: string;
  createdAt?: string;
}

const DIFFICULTY_STYLES: Record<ProblemDifficulty, { bg: string; text: string; dot: string }> = {
  UNKNOWN: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  EASY: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  MEDIUM: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  HARD: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
};

export function ProblemCard({
  displayId,
  title,
  difficulty,
  tags = [],
  courseSlug,
  createdAt,
}: ProblemCardProps) {
  const { messages } = useI18n();

  const difficultyLabels: Record<ProblemDifficulty, string> = useMemo(
    () => ({
      UNKNOWN: messages.problemsDifficultyUnknown,
      EASY: messages.problemsDifficultyEasy,
      MEDIUM: messages.problemsDifficultyMedium,
      HARD: messages.problemsDifficultyHard,
    }),
    [messages],
  );

  const diffStyle = DIFFICULTY_STYLES[difficulty];

  return (
    <Link
      href={`/courses/${courseSlug}/problems/${displayId}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#003865]/30 hover:shadow-lg"
    >
      {/* Problem ID Badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-lg bg-[#003865] px-2.5 py-1 font-mono text-xs font-bold text-white">
          {displayId}
        </span>
        {/* Difficulty Badge */}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${diffStyle.bg} ${diffStyle.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${diffStyle.dot}`} />
          {difficultyLabels[difficulty]}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#003865]">
        {title}
      </h3>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Hover Arrow Indicator */}
      <div className="absolute bottom-4 right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <svg className="h-5 w-5 text-[#003865]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </Link>
  );
}

// Loading skeleton version
export function ProblemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-6 w-14 rounded-lg bg-slate-200 skeleton-shimmer" />
        <div className="h-6 w-16 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="mb-2 h-5 w-4/5 rounded bg-slate-200 skeleton-shimmer" />
      <div className="mt-auto flex gap-1.5 pt-2">
        <div className="h-5 w-12 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-5 w-16 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
    </div>
  );
}
