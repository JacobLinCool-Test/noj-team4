'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  exportCourseLoginAuditsCsv,
  exportCourseSubmissionAuditsCsv,
  listCourseLoginAudits,
  listCourseSubmissionAudits,
  type AuditResult,
  type LoginAuditListResponse,
  type SubmissionAuditListResponse,
} from "@/lib/api/audit";
import { listCourseMembers } from "@/lib/api/course-member";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  courseSlug: string;
};

type TabKey = "logins" | "submissions";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toIso(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CourseAuditPage({ courseSlug }: Props) {
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("logins");
  const [members, setMembers] = useState<Array<{ id: number; username: string; nickname: string | null }> | null>(
    null,
  );

  const [loginData, setLoginData] = useState<LoginAuditListResponse | null>(null);
  const [submissionData, setSubmissionData] = useState<SubmissionAuditListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [loginPage, setLoginPage] = useState(1);
  const [submissionPage, setSubmissionPage] = useState(1);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loginResult, setLoginResult] = useState<AuditResult | "">("");

  const [homeworkId, setHomeworkId] = useState("");
  const [problemId, setProblemId] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");

  const queryBase = useMemo(
    () => ({
      startAt: toIso(startAt),
      endAt: toIso(endAt),
      userId: selectedUserId ? Number(selectedUserId) : undefined,
    }),
    [startAt, endAt, selectedUserId],
  );

  const loadMembers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await listCourseMembers(courseSlug, accessToken);
      setMembers(data.map((m) => ({ id: m.userId, username: m.user.username, nickname: m.user.nickname })));
    } catch {
      setMembers([]);
    }
  }, [accessToken, courseSlug]);

  const loadLogins = useCallback(
    async (page: number) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const data = await listCourseLoginAudits(
          courseSlug,
          {
            ...queryBase,
            result: loginResult || undefined,
            page,
            limit: 20,
          },
          accessToken,
        );
        setLoginData(data);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 403) {
          setUnauthorized(true);
        }
        setError(err instanceof Error ? err.message : "載入登入紀錄失敗");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, courseSlug, queryBase, loginResult],
  );

  const loadSubmissions = useCallback(
    async (page: number) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const data = await listCourseSubmissionAudits(
          courseSlug,
          {
            ...queryBase,
            homeworkId: homeworkId || undefined,
            problemId: problemId || undefined,
            status: submissionStatus || undefined,
            page,
            limit: 20,
          },
          accessToken,
        );
        setSubmissionData(data);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 403) {
          setUnauthorized(true);
        }
        setError(err instanceof Error ? err.message : "載入繳交紀錄失敗");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, courseSlug, queryBase, homeworkId, problemId, submissionStatus],
  );

  useEffect(() => {
    loadMembers().catch(() => null);
  }, [loadMembers]);

  useEffect(() => {
    if (activeTab === "logins") {
      loadLogins(loginPage).catch(() => null);
    } else {
      loadSubmissions(submissionPage).catch(() => null);
    }
  }, [activeTab, loadLogins, loadSubmissions, loginPage, submissionPage]);

  const handleExport = useCallback(async () => {
    if (!accessToken) return;
    try {
      if (activeTab === "logins") {
        const blob = await exportCourseLoginAuditsCsv(
          courseSlug,
          {
            ...queryBase,
            result: loginResult || undefined,
          },
          accessToken,
        );
        downloadBlob(blob, "course-login-audits.csv");
      } else {
        const blob = await exportCourseSubmissionAuditsCsv(
          courseSlug,
          {
            ...queryBase,
            homeworkId: homeworkId || undefined,
            problemId: problemId || undefined,
            status: submissionStatus || undefined,
          },
          accessToken,
        );
        downloadBlob(blob, "course-submission-audits.csv");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯出失敗");
    }
  }, [accessToken, activeTab, courseSlug, queryBase, loginResult, homeworkId, problemId, submissionStatus]);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#003865]">學生操作紀錄</h1>
            <p className="text-sm text-gray-700">僅教師與助教可查看學生登入與繳交的 IP 紀錄。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center rounded-md border border-[#003865] bg-white px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              匯出 CSV
            </button>
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-flex items-center rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1e5d8f]"
            >
              返回課程首頁
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("logins")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === "logins" ? "bg-[#003865] text-white" : "bg-white text-[#003865] ring-1 ring-[#003865]/30"
            }`}
          >
            登入紀錄
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === "submissions"
                ? "bg-[#003865] text-white"
                : "bg-white text-[#003865] ring-1 ring-[#003865]/30"
            }`}
          >
            繳交紀錄
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              起始時間
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              結束時間
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              使用者
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">全部</option>
                {members?.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.nickname || member.username}
                  </option>
                ))}
              </select>
            </label>
            {activeTab === "logins" ? (
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                登入結果
                <select
                  value={loginResult}
                  onChange={(e) => setLoginResult(e.target.value as AuditResult | "")}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">全部</option>
                  <option value="SUCCESS">成功</option>
                  <option value="FAILURE">失敗</option>
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                作業 ID
                <input
                  type="text"
                  value={homeworkId}
                  onChange={(e) => setHomeworkId(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="例如：cuid"
                />
              </label>
            )}
            {activeTab === "submissions" ? (
              <>
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  題目 ID
                  <input
                    type="text"
                    value={problemId}
                    onChange={(e) => setProblemId(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="displayId 或 cuid"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  狀態
                  <input
                    type="text"
                    value={submissionStatus}
                    onChange={(e) => setSubmissionStatus(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="例如：AC / WA"
                  />
                </label>
              </>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "logins") {
                  setLoginPage(1);
                  loadLogins(1).catch(() => null);
                } else {
                  setSubmissionPage(1);
                  loadSubmissions(1).catch(() => null);
                }
              }}
              className="rounded-md bg-[#003865] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
            >
              套用篩選
            </button>
            <button
              type="button"
              onClick={() => {
                setStartAt("");
                setEndAt("");
                setSelectedUserId("");
                setLoginResult("");
                setHomeworkId("");
                setProblemId("");
                setSubmissionStatus("");
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              清除篩選
            </button>
          </div>
        </div>

        {unauthorized ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <p className="font-medium">只有老師或助教可以查看學生操作紀錄。</p>
          </div>
        ) : null}

        {error && !unauthorized ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
            <p className="font-medium">載入失敗</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <div className="h-4 w-1/3 rounded bg-gray-100" />
              <div className="h-6 w-full rounded bg-gray-50" />
              <div className="h-6 w-full rounded bg-gray-50" />
            </div>
          </div>
        ) : null}

        {!loading && !unauthorized && activeTab === "logins" && loginData ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">時間</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">使用者</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">結果</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loginData.logs.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                        目前沒有資料
                      </td>
                    </tr>
                  ) : (
                    loginData.logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-gray-800">{formatDateTime(log.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {log.user ? `${log.user.username} (${log.user.email})` : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{log.result}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.ip ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-700">
              <button
                type="button"
                disabled={loginData.pagination.page <= 1}
                onClick={() => setLoginPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
              >
                上一頁
              </button>
              <span>
                第 {loginData.pagination.page} / {loginData.pagination.totalPages} 頁
              </span>
              <button
                type="button"
                disabled={loginData.pagination.page >= loginData.pagination.totalPages}
                onClick={() =>
                  setLoginPage((p) => Math.min(loginData.pagination.totalPages, p + 1))
                }
                className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
              >
                下一頁
              </button>
            </div>
          </div>
        ) : null}

        {!loading && !unauthorized && activeTab === "submissions" && submissionData ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">時間</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">使用者</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">作業</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">題目</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">狀態</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissionData.submissions.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                        目前沒有資料
                      </td>
                    </tr>
                  ) : (
                    submissionData.submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="px-4 py-3 text-gray-800">{formatDateTime(submission.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {submission.user ? submission.user.nickname || submission.user.username : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{submission.homework?.title ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {submission.problem ? `${submission.problem.displayId} ${submission.problem.title}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{submission.status}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{submission.ip ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-700">
              <button
                type="button"
                disabled={submissionData.pagination.page <= 1}
                onClick={() => setSubmissionPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
              >
                上一頁
              </button>
              <span>
                第 {submissionData.pagination.page} / {submissionData.pagination.totalPages} 頁
              </span>
              <button
                type="button"
                disabled={submissionData.pagination.page >= submissionData.pagination.totalPages}
                onClick={() =>
                  setSubmissionPage((p) => Math.min(submissionData.pagination.totalPages, p + 1))
                }
                className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
              >
                下一頁
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
