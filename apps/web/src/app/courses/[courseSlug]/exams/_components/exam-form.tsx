'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { createCourseExam, updateCourseExam } from "@/lib/api/exam";
import { listCourseProblems } from "@/lib/api/course-problem";
import type { ExamDetail } from "@/types/exam";

type ExamFormProps = {
  courseSlug: string;
  mode: "create" | "edit";
  examId?: string;
  initialData?: ExamDetail | null;
};

type ProblemOption = {
  id: string;
  displayId: string;
  title: string;
  createdAt?: string;
};

function toInputDateTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDefaultStartTime() {
  const now = new Date();
  const startDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  return toInputDateTime(startDate.toISOString());
}

function calculateDurationMinutes(startsAt: string, endsAt: string): number {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 60;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (60 * 1000)));
}

function formatEndTime(startsAt: string, durationMinutes: number): string {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExamForm({ courseSlug, mode, examId, initialData }: ExamFormProps) {
  const router = useRouter();
  const { messages } = useI18n();
  const { accessToken } = useAuth();
  const defaultStartTime = useMemo(
    () => (mode === "create" ? getDefaultStartTime() : ""),
    [mode],
  );
  const defaultDuration = useMemo(() => {
    if (mode === "edit" && initialData?.startsAt && initialData?.endsAt) {
      return calculateDurationMinutes(initialData.startsAt, initialData.endsAt);
    }
    return 60;
  }, [mode, initialData?.startsAt, initialData?.endsAt]);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startsAt, setStartsAt] = useState(
    initialData?.startsAt ? toInputDateTime(initialData.startsAt) : defaultStartTime,
  );
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [ipAllowList, setIpAllowList] = useState(initialData?.ipAllowList?.join("\n") ?? "");
  const [scoreboardVisible, setScoreboardVisible] = useState(initialData?.scoreboardVisible ?? false);
  const [selectedOrder, setSelectedOrder] = useState<string[]>(initialData?.problemIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courseProblemRaw, setCourseProblemRaw] = useState<ProblemOption[]>([]);
  const [problemBankLoading, setProblemBankLoading] = useState(true);
  const [problemBankError, setProblemBankError] = useState<string | null>(null);
  const [problemBankPage, setProblemBankPage] = useState(1);
  const [problemBankTotal, setProblemBankTotal] = useState(0);
  const [problemSearch, setProblemSearch] = useState("");
  const problemPageSize = 10;

  useEffect(() => {
    let cancelled = false;
    setProblemBankLoading(true);
    setProblemBankError(null);

    const coursePromise = accessToken
      ? listCourseProblems(
          courseSlug,
          {
            page: problemBankPage,
            pageSize: problemPageSize,
            q: problemSearch.trim() || undefined,
          },
          accessToken,
        )
      : Promise.resolve({
          items: [],
          total: 0,
          page: problemBankPage,
          pageSize: problemPageSize,
          course: { id: 0, name: "", term: "", status: "ACTIVE" },
        });

    coursePromise
      .then((courseRes) => {
        if (cancelled) return;
        const sortedItems = [...(courseRes.items ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setCourseProblemRaw(
          sortedItems.map((p) => ({
            id: p.id,
            displayId: p.displayId,
            title: p.title,
            createdAt: p.createdAt,
          })),
        );
        setProblemBankTotal(courseRes.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setCourseProblemRaw([]);
        setProblemBankError(
          err instanceof Error ? err.message : "無法載入題目列表",
        );
        setProblemBankTotal(0);
      })
      .finally(() => {
        if (!cancelled) setProblemBankLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, courseSlug, problemBankPage, problemPageSize, problemSearch]);

  const handleToggleProblem = (problemId: string, checked: boolean) => {
    setSelectedOrder((prev) => {
      if (checked) {
        if (prev.includes(problemId)) return prev;
        return [...prev, problemId];
      }
      return prev.filter((id) => id !== problemId);
    });
  };

  // Computed end time for display
  const computedEndTime = useMemo(() => {
    return formatEndTime(startsAt, durationMinutes);
  }, [startsAt, durationMinutes]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!startsAt) {
      setError("請設定考試開始時間");
      return;
    }

    const startDate = new Date(startsAt);
    if (Number.isNaN(startDate.getTime())) {
      setError("開始時間格式不正確");
      return;
    }

    if (durationMinutes < 1 || durationMinutes > 10080) {
      setError("考試時長必須在 1 到 10080 分鐘之間");
      return;
    }

    if (selectedOrder.length === 0) {
      setError("請至少選擇一道題目");
      return;
    }

    const ipList = ipAllowList
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      problemIds: selectedOrder,
      ipAllowList: ipList,
      scoreboardVisible,
    };

    try {
      setSubmitting(true);
      const result =
        mode === "create"
          ? await createCourseExam(courseSlug, payload, accessToken)
          : await updateCourseExam(courseSlug, examId ?? "", payload, accessToken);
      router.push(`/courses/${courseSlug}/exams/${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.errorGeneric;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSkeletonList = () => (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-12 rounded-md border border-gray-200 bg-gray-100" />
      ))}
    </div>
  );

  const renderProblemList = (options: ProblemOption[]) => (
    <div className="space-y-2">
      {options.map((problem) => {
        const selected = selectedOrder.includes(problem.id);
        const position = selectedOrder.findIndex((id) => id === problem.id);
        return (
          <div
            key={problem.id}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-[#1e5d8f]"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => handleToggleProblem(problem.id, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                    {problem.displayId}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{problem.title}</span>
                  {selected ? (
                    <span className="rounded-full bg-[#003865]/10 px-2 py-0.5 text-xs font-medium text-[#003865]">
                      #{position + 1}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-1">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            考試標題
            <span className="ml-1 text-red-600">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="期中考"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">考試說明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="考試注意事項..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">開始時間</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">考試時長（分鐘）</label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.max(1, Math.min(10080, parseInt(e.target.value, 10) || 1)))}
            min={1}
            max={10080}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
          {computedEndTime && (
            <p className="text-xs text-gray-500">預計結束時間：{computedEndTime}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          IP 白名單（選填，每行一個 CIDR）
        </label>
        <textarea
          value={ipAllowList}
          onChange={(e) => setIpAllowList(e.target.value)}
          rows={3}
          placeholder="140.112.0.0/16&#10;192.168.1.0/24"
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#1e5d8f] focus:outline-none"
        />
        <p className="text-xs text-gray-500">留空表示不限制 IP</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="scoreboardVisible"
          checked={scoreboardVisible}
          onChange={(e) => setScoreboardVisible(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
        />
        <label htmlFor="scoreboardVisible" className="text-sm text-gray-700">
          開放排行榜給考生查看
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-800">選擇題目</p>
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.9 14.32a8 8 0 1 1 1.414-1.414l3.386 3.387a1 1 0 0 1-1.414 1.414l-3.386-3.387ZM14 8a6 6 0 1 0-12 0 6 6 0 0 0 12 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <input
              type="search"
              value={problemSearch}
              onChange={(e) => {
                setProblemSearch(e.target.value);
                setProblemBankPage(1);
              }}
              placeholder="搜尋題目..."
              aria-label="搜尋題目"
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-2 focus:ring-[#1e5d8f]/15"
            />
          </div>
        </div>

        {problemBankError ? (
          <p className="text-sm text-red-700">{problemBankError}</p>
        ) : problemBankLoading ? (
          renderSkeletonList()
        ) : courseProblemRaw.length > 0 ? (
          renderProblemList(courseProblemRaw)
        ) : (
          <p className="text-sm text-gray-600">
            課程中沒有題目
          </p>
        )}

        {problemBankTotal > problemPageSize ? (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <button
              type="button"
              onClick={() => setProblemBankPage((prev) => Math.max(1, prev - 1))}
              disabled={problemBankPage === 1}
              className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 disabled:opacity-50"
            >
              {messages.paginationPrev}
            </button>
            <span>
              {problemBankPage} / {Math.max(1, Math.ceil(problemBankTotal / problemPageSize))}
            </span>
            <button
              type="button"
              onClick={() =>
                setProblemBankPage((prev) =>
                  Math.min(Math.ceil(problemBankTotal / problemPageSize), prev + 1),
                )
              }
              disabled={problemBankPage >= Math.ceil(problemBankTotal / problemPageSize)}
              className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 disabled:opacity-50"
            >
              {messages.paginationNext}
            </button>
          </div>
        ) : null}

        {selectedOrder.length > 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            已選擇 {selectedOrder.length} 道題目
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1e5d8f] disabled:opacity-70"
        >
          {submitting ? "儲存中..." : "儲存考試"}
        </button>
        <Link
          href={
            mode === "edit" && examId
              ? `/courses/${courseSlug}/exams/${examId}`
              : `/courses/${courseSlug}/exams`
          }
          className="text-sm font-medium text-[#1e5d8f] hover:underline"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
