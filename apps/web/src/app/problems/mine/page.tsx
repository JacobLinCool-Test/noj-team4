'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useProblems } from "@/hooks/useProblems";
import { deleteProblem, type Problem, type ProblemDifficulty } from "@/lib/api/problem";

const DIFFICULTY_OPTIONS: Array<{ value: ProblemDifficulty | ""; labelKey: keyof typeof import("@/i18n/messages").messages["zh-TW"] }> = [
  { value: "", labelKey: "problemsDifficultyAll" },
  { value: "EASY", labelKey: "problemsDifficultyEasy" },
  { value: "MEDIUM", labelKey: "problemsDifficultyMedium" },
  { value: "HARD", labelKey: "problemsDifficultyHard" },
];

function DifficultyBadge({ diff, labelMap }: { diff: ProblemDifficulty; labelMap: Record<ProblemDifficulty, string> }) {
  const styles: Record<ProblemDifficulty, string> = {
    UNKNOWN: "bg-gray-100 text-gray-700",
    EASY: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HARD: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles[diff]}`}>
      {labelMap[diff]}
    </span>
  );
}

function VisibilityBadge({ visibility, messages }: { visibility: string; messages: any }) {
  const config: Record<string, { icon: string; color: string; label: string }> = {
    PUBLIC: { icon: "🔓", color: "bg-blue-100 text-blue-700", label: messages.problemVisibilityPublic || "公開" },
    UNLISTED: { icon: "👥", color: "bg-blue-50 text-blue-700", label: messages.problemVisibilityUnlisted || "不公開" },
    PRIVATE: { icon: "🔒", color: "bg-gray-100 text-gray-700", label: messages.problemVisibilityPrivate || "私人" },
    HIDDEN: { icon: "👁️", color: "bg-gray-200 text-gray-600", label: messages.problemVisibilityHidden || "隱藏" },
  };
  const cfg = config[visibility] || config.PRIVATE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

export default function MyProblemsPage() {
  const { messages } = useI18n();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty | "">("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: problems, loading, hasFetched, error, refetch } = useProblems({
    q: q.trim() || undefined,
    difficulty: difficulty || undefined,
    accessToken,
    scope: "mine",
  });

  const visibleProblems = problems?.filter((problem) => problem.visibility === "PUBLIC") ?? null;

  const difficultyLabels: Record<ProblemDifficulty, string> = {
    UNKNOWN: messages.problemsDifficultyUnknown,
    EASY: messages.problemsDifficultyEasy,
    MEDIUM: messages.problemsDifficultyMedium,
    HARD: messages.problemsDifficultyHard,
  };

  if (!user) {
    router.push("/login?next=/problems/mine");
    return null;
  }

  const handleDelete = async (problem: Problem) => {
    if (!accessToken) {
      router.push("/login?next=/problems/mine");
      return;
    }
    const ok = window.confirm(messages.problemDeleteConfirm || "確定要刪除這道題目嗎？此操作無法復原。");
    if (!ok) return;

    setDeleteError(null);
    setDeletingId(problem.id);
    try {
      await deleteProblem(problem.id, accessToken);
      refetch();
    } catch (err) {
      setDeleteError(messages.problemDeleteError || "刪除題目失敗，請稍後再試。");
    } finally {
      setDeletingId(null);
    }
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-shimmer relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-5 w-16 rounded bg-gray-200/80" />
            <div className="h-5 w-1/3 rounded bg-gray-200/80" />
          </div>
          <div className="mt-2 h-3 w-1/4 rounded bg-gray-200/70" />
        </div>
      ))}
    </div>
  );

  const renderError = (message: string, onRetry: () => void) => (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{messages.problemsError}</p>
      <p className="mt-1 font-mono text-xs text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md bg-[#003865] px-3 py-1 text-white hover:bg-[#1e5d8f]"
      >
        {messages.retry}
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <p className="text-base font-medium text-gray-700">{messages.problemsMineEmpty || "尚未建立任何題目"}</p>
      <p className="mt-2 text-sm text-gray-500">{messages.problemsMineEmptyHint || "點擊「建立新題目」開始建立你的第一個題目"}</p>
      <Link
        href="/problems/new"
        className="mt-4 inline-block rounded-md bg-[#003865] px-4 py-2 text-sm text-white hover:bg-[#1e5d8f]"
      >
        {messages.problemsNewProblem}
      </Link>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#003865]">{messages.problemsMineTitle || "我建立的題目"}</h1>
            <p className="text-sm text-gray-600">{messages.problemsMineSubtitle || "管理你建立的所有題目"}</p>
          </div>
          <Link
            href="/problems"
            className="text-sm text-[#003865] hover:underline"
          >
            ← {messages.problemsMineBackToList || "返回題庫"}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">
            {messages.problemsFilterDifficulty}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty | "")}
              className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#1e5d8f] focus:outline-none"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {messages[opt.labelKey]}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder={messages.problemsSearchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-44 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
          <Link
            href="/problems/new"
            className="inline-flex items-center rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e5d8f]"
          >
            {messages.problemsNewProblem}
          </Link>
        </div>
      </div>

      {loading && !hasFetched ? (
        renderLoadingSkeleton()
      ) : error ? (
        renderError(error, refetch)
      ) : !visibleProblems || visibleProblems.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="space-y-3">
          {deleteError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {deleteError}
            </div>
          ) : null}
          {visibleProblems.map((problem) => (
            <div
              key={problem.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/problems/${problem.displayId}`}
                      className="font-mono text-sm font-medium text-[#003865] hover:underline"
                    >
                      {problem.displayId}
                    </Link>
                    <Link
                      href={`/problems/${problem.displayId}`}
                      className="text-base font-medium text-gray-900 hover:text-[#003865]"
                    >
                      {problem.title}
                    </Link>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <VisibilityBadge visibility={problem.visibility} messages={messages} />
                    <DifficultyBadge diff={problem.difficulty} labelMap={difficultyLabels} />
                    <span className="text-xs text-gray-500">
                      {new Date(problem.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/problems/${problem.displayId}/edit`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {messages.problemsEdit || "編輯"}
                  </Link>
                  {problem.canDelete ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(problem)}
                      disabled={deletingId === problem.id}
                      className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingId === problem.id
                        ? messages.problemDeleting || "刪除中..."
                        : messages.problemDeleteButton || "刪除"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
