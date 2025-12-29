'use client';

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import {
  createCourseHomework,
  updateCourseHomework,
} from "@/lib/api/homework";
import { listCourseProblems, cloneProblemToCourse } from "@/lib/api/course-problem";
import { listProblems } from "@/lib/api/problem";
import type { HomeworkDetail } from "@/types/homework";

type HomeworkFormProps = {
  courseSlug: string;
  mode: "create" | "edit";
  homeworkId?: string;
  initialData?: HomeworkDetail | null;
};

type ProblemOption = {
  id: string;
  displayId: string;
  title: string;
  createdAt?: string;
  isMissing?: boolean;
  isPublic?: boolean;
};

type TabType = "course" | "public";

function toInputDateTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDefaultScheduleInputValues() {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  endDate.setHours(23, 59, 59, 0);
  return {
    startAt: toInputDateTime(startDate.toISOString()),
    endAt: toInputDateTime(endDate.toISOString()),
  };
}

export function HomeworkForm({ courseSlug, mode, homeworkId, initialData }: HomeworkFormProps) {
  const router = useRouter();
  const { messages } = useI18n();
  const { accessToken } = useAuth();
  const defaultSchedule = useMemo(
    () => (mode === "create" ? getDefaultScheduleInputValues() : { startAt: "", endAt: "" }),
    [mode],
  );
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startAt, setStartAt] = useState(
    initialData?.startAt ? toInputDateTime(initialData.startAt) : defaultSchedule.startAt,
  );
  const [endAt, setEndAt] = useState(
    initialData?.endAt ? toInputDateTime(initialData.endAt) : defaultSchedule.endAt,
  );
  const [selectedOrder, setSelectedOrder] = useState<string[]>(
    initialData?.problems?.sort((a, b) => a.order - b.order).map((p) => p.problem.id) ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("course");

  // Course problems state
  const [courseProblemRaw, setCourseProblemRaw] = useState<ProblemOption[]>([]);
  const [courseProblemLoading, setCourseProblemLoading] = useState(true);
  const [courseProblemError, setCourseProblemError] = useState<string | null>(null);
  const [courseProblemPage, setCourseProblemPage] = useState(1);
  const [courseProblemTotal, setCourseProblemTotal] = useState(0);
  const [courseSearch, setCourseSearch] = useState("");

  // Public problems state
  const [publicProblemRaw, setPublicProblemRaw] = useState<ProblemOption[]>([]);
  const [publicProblemLoading, setPublicProblemLoading] = useState(false);
  const [publicProblemError, setPublicProblemError] = useState<string | null>(null);
  const [publicProblemPage, setPublicProblemPage] = useState(1);
  const [publicProblemTotal, setPublicProblemTotal] = useState(0);
  const [publicSearch, setPublicSearch] = useState("");

  // Cloning state
  const [cloningProblemId, setCloningProblemId] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  const problemPageSize = 10;

  // Track cloned problem ID mappings (public ID -> course ID)
  const [clonedProblemMap, setClonedProblemMap] = useState<Map<string, string>>(new Map());

  // Load course problems
  useEffect(() => {
    let cancelled = false;
    setCourseProblemLoading(true);
    setCourseProblemError(null);

    const coursePromise = accessToken
      ? listCourseProblems(
          courseSlug,
          {
            page: courseProblemPage,
            pageSize: problemPageSize,
            q: courseSearch.trim() || undefined,
          },
          accessToken,
        )
      : Promise.resolve({
          items: [],
          total: 0,
          page: courseProblemPage,
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
        setCourseProblemTotal(courseRes.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setCourseProblemRaw([]);
        setCourseProblemError(
          err instanceof Error ? err.message : messages.homeworksPublicProblemsError,
        );
        setCourseProblemTotal(0);
      })
      .finally(() => {
        if (!cancelled) setCourseProblemLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    courseSlug,
    messages.homeworksPublicProblemsError,
    courseProblemPage,
    problemPageSize,
    courseSearch,
  ]);

  // Load public problems when tab is active
  useEffect(() => {
    if (activeTab !== "public") return;

    let cancelled = false;
    setPublicProblemLoading(true);
    setPublicProblemError(null);

    listProblems(
      {
        page: publicProblemPage,
        pageSize: problemPageSize,
        q: publicSearch.trim() || undefined,
        scope: "public",
      },
      accessToken,
    )
      .then((res) => {
        if (cancelled) return;
        setPublicProblemRaw(
          res.items.map((p) => ({
            id: p.id,
            displayId: p.displayId,
            title: p.title,
            createdAt: p.createdAt,
            isPublic: true,
          })),
        );
        setPublicProblemTotal(res.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setPublicProblemRaw([]);
        setPublicProblemError(
          err instanceof Error ? err.message : messages.homeworksPublicProblemsError,
        );
        setPublicProblemTotal(0);
      })
      .finally(() => {
        if (!cancelled) setPublicProblemLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, accessToken, publicProblemPage, publicSearch, messages.homeworksPublicProblemsError]);

  const allBankProblemOptions: ProblemOption[] = useMemo(
    () => courseProblemRaw,
    [courseProblemRaw],
  );
  const bankProblemIdSet = useMemo(
    () => new Set(allBankProblemOptions.map((p) => p.id)),
    [allBankProblemOptions],
  );
  const existingProblemOptions: ProblemOption[] = useMemo(() => {
    if (!initialData) return [];
    const extras: ProblemOption[] = [];
    initialData.problems.forEach((p) => {
      const id = p.problem.id;
      if (!bankProblemIdSet.has(id)) {
        const missing = true;
        extras.push({
          id,
          displayId: p.problem.displayId,
          title: missing ? messages.homeworksProblemMissing : p.problem.title,
          isMissing: missing,
        });
      }
    });
    return extras;
  }, [initialData, bankProblemIdSet, messages.homeworksProblemMissing]);

  const handleToggleProblem = useCallback((problemId: string, checked: boolean) => {
    setSelectedOrder((prev) => {
      if (checked) {
        if (prev.includes(problemId)) return prev;
        return [...prev, problemId];
      }
      return prev.filter((id) => id !== problemId);
    });
  }, []);

  // Handle cloning a public problem to course
  const handleCloneAndSelect = useCallback(async (publicProblem: ProblemOption) => {
    if (!accessToken) return;

    setCloningProblemId(publicProblem.id);
    setCloneSuccess(null);
    setError(null);

    try {
      const result = await cloneProblemToCourse(
        courseSlug,
        { sourceProblemId: publicProblem.id },
        accessToken,
      );

      // Add the cloned problem to the course problems list
      const clonedProblem: ProblemOption = {
        id: result.problem.id,
        displayId: result.problem.displayId,
        title: result.problem.title,
        createdAt: result.problem.createdAt,
      };

      setCourseProblemRaw((prev) => [clonedProblem, ...prev]);
      setCourseProblemTotal((prev) => prev + 1);

      // Track the mapping
      setClonedProblemMap((prev) => new Map(prev).set(publicProblem.id, result.problem.id));

      // Select the cloned problem
      setSelectedOrder((prev) => {
        if (prev.includes(result.problem.id)) return prev;
        return [...prev, result.problem.id];
      });

      setCloneSuccess(messages.homeworksCloneSuccess);

      // Switch to course tab to show the newly cloned problem
      setActiveTab("course");
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.homeworksCloneError);
    } finally {
      setCloningProblemId(null);
    }
  }, [accessToken, courseSlug, messages.homeworksCloneSuccess, messages.homeworksCloneError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!startAt || !endAt) {
      setError(messages.homeworksErrorsInvalidTimeRange);
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      setError(messages.homeworksErrorsInvalidTimeRange);
      return;
    }

    if (selectedOrder.length === 0) {
      setError(messages.homeworksErrorsMustSelectAtLeastOneProblem);
      return;
    }

    const problemsPayload = selectedOrder.map((problemId) => ({ problemId }));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      problems: problemsPayload,
    };

    try {
      setSubmitting(true);
      const result =
        mode === "create"
          ? await createCourseHomework(courseSlug, payload, accessToken)
          : await updateCourseHomework(courseSlug, homeworkId ?? "", payload, accessToken);
      router.push(`/courses/${courseSlug}/homeworks/${result.id}`);
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

  const renderCourseProblemList = (options: ProblemOption[]) => (
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

  const renderPublicProblemList = (options: ProblemOption[]) => (
    <div className="space-y-2">
      {options.map((problem) => {
        const isCloned = clonedProblemMap.has(problem.id);
        const isCloning = cloningProblemId === problem.id;
        const clonedId = clonedProblemMap.get(problem.id);
        const isSelected = clonedId ? selectedOrder.includes(clonedId) : false;

        return (
          <div
            key={problem.id}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-[#1e5d8f]"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-700">
                    {problem.displayId}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{problem.title}</span>
                  {isCloned && isSelected ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {messages.homeworksCloneSuccess}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCloneAndSelect(problem)}
                disabled={isCloning || isCloned}
                className="inline-flex items-center rounded-md border border-[#003865] px-3 py-1 text-xs font-medium text-[#003865] hover:bg-[#003865] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCloning ? (
                  <>
                    <svg className="mr-1 h-3 w-3 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {messages.homeworksCloning}
                  </>
                ) : isCloned ? (
                  <span className="text-green-600">{messages.homeworksCloneSuccess}</span>
                ) : (
                  messages.homeworksClonePublicProblem
                )}
              </button>
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
            {messages.homeworksFormTitle}
            <span className="ml-1 text-red-600">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{messages.homeworksFormDescription}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{messages.homeworksFormStartAt}</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{messages.homeworksFormEndAt}</label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-800">{messages.homeworksFormProblems}</p>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Problem tabs">
            <button
              type="button"
              onClick={() => setActiveTab("course")}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                activeTab === "course"
                  ? "border-[#003865] text-[#003865]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {messages.homeworksProblemBankTabCourse}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("public")}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                activeTab === "public"
                  ? "border-[#003865] text-[#003865]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {messages.homeworksProblemBankTabPublic}
            </button>
          </nav>
        </div>

        {/* Course Problems Tab */}
        {activeTab === "course" ? (
          <div className="space-y-4">
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
                value={courseSearch}
                onChange={(e) => {
                  setCourseSearch(e.target.value);
                  setCourseProblemPage(1);
                }}
                placeholder={messages.homeworksProblemSearchPlaceholder}
                aria-label={messages.homeworksProblemSearchPlaceholder}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-2 focus:ring-[#1e5d8f]/15"
              />
            </div>

            {courseProblemError ? (
              <p className="text-sm text-red-700">{courseProblemError}</p>
            ) : courseProblemLoading ? (
              renderSkeletonList()
            ) : courseProblemRaw.length > 0 ? (
              renderCourseProblemList(courseProblemRaw)
            ) : (
              <p className="text-sm text-gray-600">
                {messages.homeworksCourseProblemsEmpty}
              </p>
            )}

            {courseProblemTotal > problemPageSize ? (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => setCourseProblemPage((prev) => Math.max(1, prev - 1))}
                  disabled={courseProblemPage === 1}
                  className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 disabled:opacity-50"
                >
                  {messages.paginationPrev}
                </button>
                <span>
                  {courseProblemPage} / {Math.max(1, Math.ceil(courseProblemTotal / problemPageSize))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCourseProblemPage((prev) =>
                      Math.min(Math.ceil(courseProblemTotal / problemPageSize), prev + 1),
                    )
                  }
                  disabled={courseProblemPage >= Math.ceil(courseProblemTotal / problemPageSize)}
                  className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 disabled:opacity-50"
                >
                  {messages.paginationNext}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Public Problems Tab */}
        {activeTab === "public" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{messages.homeworksClonePublicProblemHint}</p>

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
                value={publicSearch}
                onChange={(e) => {
                  setPublicSearch(e.target.value);
                  setPublicProblemPage(1);
                }}
                placeholder={messages.homeworksProblemSearchPlaceholder}
                aria-label={messages.homeworksProblemSearchPlaceholder}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-2 focus:ring-[#1e5d8f]/15"
              />
            </div>

            {publicProblemError ? (
              <p className="text-sm text-red-700">{publicProblemError}</p>
            ) : publicProblemLoading ? (
              renderSkeletonList()
            ) : publicProblemRaw.length > 0 ? (
              renderPublicProblemList(publicProblemRaw)
            ) : (
              <p className="text-sm text-gray-600">
                {messages.homeworksPublicProblemsEmpty}
              </p>
            )}

            {publicProblemTotal > problemPageSize ? (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => setPublicProblemPage((prev) => Math.max(1, prev - 1))}
                  disabled={publicProblemPage === 1}
                  className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 disabled:opacity-50"
                >
                  {messages.paginationPrev}
                </button>
                <span>
                  {publicProblemPage} / {Math.max(1, Math.ceil(publicProblemTotal / problemPageSize))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPublicProblemPage((prev) =>
                      Math.min(Math.ceil(publicProblemTotal / problemPageSize), prev + 1),
                    )
                  }
                  disabled={publicProblemPage >= Math.ceil(publicProblemTotal / problemPageSize)}
                  className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 disabled:opacity-50"
                >
                  {messages.paginationNext}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {existingProblemOptions.length > 0 ? (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#003865]">
                {messages.homeworksExistingProblemsTitle}
              </h4>
            </div>
            {renderCourseProblemList(existingProblemOptions)}
          </section>
        ) : null}
      </div>

      {cloneSuccess ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{cloneSuccess}</div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1e5d8f] disabled:opacity-70"
        >
          {submitting ? messages.homeworksFormSaving : messages.homeworksFormSave}
        </button>
        <Link
          href={
            mode === "edit" && homeworkId
              ? `/courses/${courseSlug}/homeworks/${homeworkId}`
              : `/courses/${courseSlug}/homeworks`
          }
          className="text-sm font-medium text-[#1e5d8f] hover:underline"
        >
          {messages.homeworksFormCancel}
        </Link>
      </div>
    </form>
  );
}
