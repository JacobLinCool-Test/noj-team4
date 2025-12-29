"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  listAdminUsers,
  listAuthEvents,
  listEmailSendLogs,
  type AdminUserListResponse,
  type AuditLogListResponse,
  type EmailSendLogListResponse,
} from "@/lib/api/admin";
import { getSubmissions, type SubmissionListResponse } from "@/lib/api/submission";

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

function clampPage(page: number, totalPages: number) {
  return Math.max(1, Math.min(page, Math.max(1, totalPages)));
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { locale } = useI18n();

  const t = useMemo(() => {
    if (locale === "zh-TW") {
      return {
        title: "系統管理（Admin）",
        subtitle: "僅限系統管理員使用，包含使用者、Email、行為紀錄、近期提交概況。",
        loginRequired: "請先登入。",
        forbidden: "您沒有權限檢視此頁面。",
        backHome: "回首頁",
        usersTitle: "使用者（最新註冊）",
        emailLogsTitle: "Email 發送紀錄",
        authEventsTitle: "最近註冊 / 登入 / 登出",
        submissionsTitle: "最近提交紀錄",
        loading: "載入中…",
        empty: "目前沒有資料。",
        prev: "上一頁",
        next: "下一頁",
        page: "頁",
        of: " / ",
        viewAll: "查看全部",
        colCreatedAt: "時間",
        colUser: "使用者",
        colEmail: "Email",
        colRole: "角色",
        colStatus: "狀態",
        colVerified: "已驗證",
        colAction: "事件",
        colResult: "結果",
        colIp: "IP",
        colType: "類型",
        colSubject: "主旨",
        colProvider: "寄送方式",
        colError: "錯誤",
        colProblem: "題目",
        colLanguage: "語言",
        colSubmission: "提交",
        aiSettings: "AI 模型設定",
        emailDomains: "Email 網域管理",
        systemSettings: "系統設定",
        bulkCreateUsers: "批量新增用戶",
        userManagement: "用戶管理",
        demoData: "Demo 資料生成",
        blockedSubmissions: "被封鎖的提交",
      };
    }
    return {
      title: "Admin Dashboard",
      subtitle: "Admin-only overview: users, email, audit events, and recent submissions.",
      loginRequired: "Please sign in first.",
      forbidden: "You don't have permission to view this page.",
      backHome: "Back to home",
      usersTitle: "Users (Newest first)",
      emailLogsTitle: "Email Send Logs",
      authEventsTitle: "Recent Register / Login / Logout",
      submissionsTitle: "Recent Submissions",
      loading: "Loading…",
      empty: "No data yet.",
      prev: "Prev",
      next: "Next",
      page: "Page",
      of: " / ",
      viewAll: "View all",
      colCreatedAt: "Time",
      colUser: "User",
      colEmail: "Email",
      colRole: "Role",
      colStatus: "Status",
      colVerified: "Verified",
      colAction: "Action",
      colResult: "Result",
      colIp: "IP",
      colType: "Type",
      colSubject: "Subject",
      colProvider: "Provider",
      colError: "Error",
      colProblem: "Problem",
      colLanguage: "Lang",
      colSubmission: "Submission",
      aiSettings: "AI Model Settings",
      emailDomains: "Email Domain Settings",
      systemSettings: "System Settings",
      bulkCreateUsers: "Bulk Create Users",
      userManagement: "User Management",
      demoData: "Demo Data Generator",
      blockedSubmissions: "Blocked Submissions",
    };
  }, [locale]);

  const [usersPage, setUsersPage] = useState(1);
  const [emailPage, setEmailPage] = useState(1);
  const [authEventsPage, setAuthEventsPage] = useState(1);
  const [submissionsPage, setSubmissionsPage] = useState(1);

  const [users, setUsers] = useState<AdminUserListResponse | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailSendLogListResponse | null>(null);
  const [authEvents, setAuthEvents] = useState<AuditLogListResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListResponse | null>(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [authEventsLoading, setAuthEventsLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [usersError, setUsersError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [authEventsError, setAuthEventsError] = useState<string | null>(null);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  const loadUsers = useCallback(
    async (page: number) => {
      if (!accessToken) return;
      setUsersLoading(true);
      setUsersError(null);
      try {
        const data = await listAdminUsers({ page, limit: 10 }, accessToken);
        setUsers(data);
      } catch (err) {
        setUsersError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    },
    [accessToken],
  );

  const loadEmailLogs = useCallback(
    async (page: number) => {
      if (!accessToken) return;
      setEmailLoading(true);
      setEmailError(null);
      try {
        const data = await listEmailSendLogs({ page, limit: 10 }, accessToken);
        setEmailLogs(data);
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : "Failed to load email logs");
      } finally {
        setEmailLoading(false);
      }
    },
    [accessToken],
  );

  const loadAuthEvents = useCallback(
    async (page: number) => {
      if (!accessToken) return;
      setAuthEventsLoading(true);
      setAuthEventsError(null);
      try {
        const data = await listAuthEvents({ page, limit: 10 }, accessToken);
        setAuthEvents(data);
      } catch (err) {
        setAuthEventsError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        setAuthEventsLoading(false);
      }
    },
    [accessToken],
  );

  const loadSubmissions = useCallback(
    async (page: number) => {
      if (!accessToken) return;
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        const data = await getSubmissions({ page, limit: 10 }, accessToken);
        setSubmissions(data);
      } catch (err) {
        setSubmissionsError(err instanceof Error ? err.message : "Failed to load submissions");
      } finally {
        setSubmissionsLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) return;
    loadUsers(usersPage);
    loadEmailLogs(emailPage);
    loadAuthEvents(authEventsPage);
    loadSubmissions(submissionsPage);
  }, [
    authLoading,
    user,
    isAdmin,
    router,
    loadUsers,
    loadEmailLogs,
    loadAuthEvents,
    loadSubmissions,
    usersPage,
    emailPage,
    authEventsPage,
    submissionsPage,
  ]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {t.loading}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          {t.loginRequired}{" "}
          <Link href="/login" className="text-[#003865] hover:underline">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <div className="font-semibold">{t.forbidden}</div>
          <div className="mt-3">
            <Link href="/" className="text-[#003865] hover:underline">
              {t.backHome}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const usersTotalPages = users?.pagination.totalPages ?? 1;
  const emailTotalPages = emailLogs?.pagination.totalPages ?? 1;
  const authTotalPages = authEvents?.pagination.totalPages ?? 1;
  const submissionsTotalPages = submissions?.pagination.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      {isDemoAdmin && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>※ 唯讀模式：</strong>僅能查看後台，實際做出修改的權限已被移除。
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#003865]">{t.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{t.subtitle}</p>
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/audit"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              查看行為紀錄
            </Link>
            <Link
              href="/admin/ai-settings"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              {t.aiSettings}
            </Link>
            <Link
              href="/admin/email-domains"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              {t.emailDomains}
            </Link>
            <Link
              href="/admin/system-settings"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              {t.systemSettings}
            </Link>
            <Link
              href="/admin/bulk-create-users"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              {t.bulkCreateUsers}
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              {t.userManagement}
            </Link>
            <Link
              href="/admin/demo-data"
              className="inline-flex items-center rounded-md border border-[#003865] px-3 py-2 text-sm font-medium text-[#003865] hover:bg-[#003865] hover:text-white"
            >
              {t.demoData}
            </Link>
            <Link
              href="/admin/blocked-submissions"
              className="inline-flex items-center rounded-md border border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500 hover:text-white"
            >
              {t.blockedSubmissions}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#003865]">{t.usersTitle}</h2>
          </div>

          {usersError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {usersError}
            </div>
          ) : usersLoading && !users ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : users?.users?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">{t.colCreatedAt}</th>
                    <th className="py-2 pr-3">{t.colUser}</th>
                    <th className="py-2 pr-3">{t.colEmail}</th>
                    <th className="py-2 pr-3">{t.colRole}</th>
                    <th className="py-2">{t.colVerified}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.users.map((u) => (
                    <tr key={u.id} className="align-top">
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {formatDateTime(u.createdAt, locale)}
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={`/users/${u.username}`} className="text-[#003865] hover:underline">
                          {u.username}
                        </Link>
                        <div className="text-xs text-gray-500">#{u.id}</div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{u.email}</td>
                      <td className="py-2 pr-3 text-xs">{u.role}</td>
                      <td className="py-2 text-xs">
                        {u.emailVerifiedAt ? (
                          <span className="rounded bg-green-50 px-2 py-1 text-green-700">Yes</span>
                        ) : (
                          <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-700">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.empty}</div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {t.page} {usersPage}
              {t.of}
              {usersTotalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={usersLoading || usersPage <= 1}
                onClick={() => setUsersPage((p) => clampPage(p - 1, usersTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.prev}
              </button>
              <button
                type="button"
                disabled={usersLoading || usersPage >= usersTotalPages}
                onClick={() => setUsersPage((p) => clampPage(p + 1, usersTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.next}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#003865]">{t.emailLogsTitle}</h2>
          </div>

          {emailError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {emailError}
            </div>
          ) : emailLoading && !emailLogs ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : emailLogs?.logs?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">{t.colCreatedAt}</th>
                    <th className="py-2 pr-3">{t.colType}</th>
                    <th className="py-2 pr-3">{t.colResult}</th>
                    <th className="py-2 pr-3">{t.colEmail}</th>
                    <th className="py-2 pr-3">{t.colSubject}</th>
                    <th className="py-2">{t.colError}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emailLogs.logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {formatDateTime(log.createdAt, locale)}
                      </td>
                      <td className="py-2 pr-3 text-xs">{log.type}</td>
                      <td className="py-2 pr-3 text-xs">{log.status}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{log.recipientEmail}</td>
                      <td className="py-2 pr-3 text-xs">{log.subject ?? "-"}</td>
                      <td className="py-2 text-xs text-red-700">{log.error ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.empty}</div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {t.page} {emailPage}
              {t.of}
              {emailTotalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={emailLoading || emailPage <= 1}
                onClick={() => setEmailPage((p) => clampPage(p - 1, emailTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.prev}
              </button>
              <button
                type="button"
                disabled={emailLoading || emailPage >= emailTotalPages}
                onClick={() => setEmailPage((p) => clampPage(p + 1, emailTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.next}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#003865]">{t.authEventsTitle}</h2>
          </div>

          {authEventsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {authEventsError}
            </div>
          ) : authEventsLoading && !authEvents ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : authEvents?.logs?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">{t.colCreatedAt}</th>
                    <th className="py-2 pr-3">{t.colAction}</th>
                    <th className="py-2 pr-3">{t.colResult}</th>
                    <th className="py-2 pr-3">{t.colUser}</th>
                    <th className="py-2">{t.colIp}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {authEvents.logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {formatDateTime(log.createdAt, locale)}
                      </td>
                      <td className="py-2 pr-3 text-xs">{log.action}</td>
                      <td className="py-2 pr-3 text-xs">{log.result}</td>
                      <td className="py-2 pr-3 text-xs">
                        {log.user ? (
                          <Link href={`/users/${log.user.username}`} className="text-[#003865] hover:underline">
                            {log.user.username}
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 text-xs font-mono">{log.ip ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.empty}</div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {t.page} {authEventsPage}
              {t.of}
              {authTotalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={authEventsLoading || authEventsPage <= 1}
                onClick={() => setAuthEventsPage((p) => clampPage(p - 1, authTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.prev}
              </button>
              <button
                type="button"
                disabled={authEventsLoading || authEventsPage >= authTotalPages}
                onClick={() => setAuthEventsPage((p) => clampPage(p + 1, authTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.next}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#003865]">{t.submissionsTitle}</h2>
            <Link href="/submissions" className="text-sm text-[#003865] hover:underline">
              {t.viewAll}
            </Link>
          </div>

          {submissionsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {submissionsError}
            </div>
          ) : submissionsLoading && !submissions ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : submissions?.submissions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">{t.colCreatedAt}</th>
                    <th className="py-2 pr-3">{t.colSubmission}</th>
                    <th className="py-2 pr-3">{t.colUser}</th>
                    <th className="py-2 pr-3">{t.colProblem}</th>
                    <th className="py-2 pr-3">{t.colStatus}</th>
                    <th className="py-2">{t.colIp}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.submissions.map((s) => (
                    <tr key={s.id} className="align-top">
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {formatDateTime(s.createdAt, locale)}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <Link href={`/submissions/${s.id}`} className="font-mono text-[#003865] hover:underline">
                          {s.id.slice(0, 8)}
                        </Link>
                        <div className="text-[11px] text-gray-500">{s.language}</div>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {s.user?.username ? (
                          <Link href={`/users/${s.user.username}`} className="text-[#003865] hover:underline">
                            {s.user.username}
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {s.problem?.displayId ? (
                          <Link href={`/problems/${s.problem.displayId}`} className="text-[#003865] hover:underline">
                            {s.problem.displayId}
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">{s.status}</td>
                      <td className="py-2 text-xs font-mono">{s.ip ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.empty}</div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {t.page} {submissionsPage}
              {t.of}
              {submissionsTotalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submissionsLoading || submissionsPage <= 1}
                onClick={() => setSubmissionsPage((p) => clampPage(p - 1, submissionsTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.prev}
              </button>
              <button
                type="button"
                disabled={submissionsLoading || submissionsPage >= submissionsTotalPages}
                onClick={() => setSubmissionsPage((p) => clampPage(p + 1, submissionsTotalPages))}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {t.next}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
