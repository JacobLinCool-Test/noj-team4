"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  getDemoDataStatus,
  generateDemoData,
  clearDemoData,
  type DemoDataStatus,
  type DemoDataResult,
  type ClearDemoDataResult,
} from "@/lib/api/admin";

export default function AdminDemoDataPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const { locale } = useI18n();

  const t = useMemo(() => {
    if (locale === "zh-TW") {
      return {
        loading: "載入中...",
        demoDataForbidden: "拒絕存取。僅限管理員。",
        demoDataBackToAdmin: "返回管理後台",
        demoDataTitle: "Demo 資料生成器",
        demoDataDescription: "生成或清除測試用的 Demo 資料。包含使用者、題目、課程等。",
        demoDataCurrentStatus: "目前狀態",
        demoDataAdminUser: "Admin 用戶",
        demoDataDemoUsers: "Demo 用戶",
        demoDataPublicProblems: "公開題目",
        demoDataCourses: "課程",
        demoDataGenerating: "生成中...",
        demoDataGenerateButton: "生成 Demo 資料",
        demoDataClearing: "清除中...",
        demoDataClearButton: "清除 Demo 資料",
        demoDataClearSuccess: "Demo 資料已成功清除",
        demoDataUsersDeleted: "已刪除用戶數",
        demoDataProblemsDeleted: "已刪除題目數",
        demoDataCoursesDeleted: "已刪除課程數",
        demoDataGenerateSuccess: "Demo 資料已成功生成",
        demoDataUsersCreated: "已建立用戶數",
        demoDataProblemsCreated: "已建立題目數",
        demoDataCoursesCreated: "已建立課程數",
        demoDataSkipped: "跳過",
        demoDataAdminUserCreated: "Admin 用戶已建立",
        demoDataUsername: "用戶名稱",
        demoDataEmail: "Email",
        demoDataPassword: "密碼",
        demoDataPasswordWarning: "此密碼只會顯示一次，請立即儲存。",
        demoDataDemoUsersCreated: "Demo 用戶已建立",
        demoDataPublicProblemsCreated: "公開題目",
        demoDataExists: "已存在",
        demoDataProblems: "題目",
        demoDataMembers: "成員",
        demoDataHomeworks: "作業",
        demoDataAnnouncements: "公告",
        demoDataConfirmGenerate: "確認生成 Demo 資料",
        demoDataConfirmGenerateMessage: "這將建立 Demo 用戶、題目、課程等資料。已存在的 Demo 資料將會跳過。確定要繼續嗎？",
        demoDataConfirmClear: "確認清除 Demo 資料",
        demoDataConfirmClearMessage: "這將永久刪除所有 Demo 用戶、題目和課程。此操作無法復原。確定要繼續嗎？",
        demoDataConfirmClearButton: "是，清除全部",
        cancel: "取消",
        confirm: "確認",
      };
    }
    return {
      loading: "Loading...",
      demoDataForbidden: "Access denied. Admin only.",
      demoDataBackToAdmin: "Back to Admin",
      demoDataTitle: "Demo Data Generator",
      demoDataDescription: "Generate or clear demo data for testing purposes. This includes users, problems, courses, and more.",
      demoDataCurrentStatus: "Current Status",
      demoDataAdminUser: "Admin User",
      demoDataDemoUsers: "Demo Users",
      demoDataPublicProblems: "Public Problems",
      demoDataCourses: "Courses",
      demoDataGenerating: "Generating...",
      demoDataGenerateButton: "Generate Demo Data",
      demoDataClearing: "Clearing...",
      demoDataClearButton: "Clear Demo Data",
      demoDataClearSuccess: "Demo Data Cleared Successfully",
      demoDataUsersDeleted: "Users deleted",
      demoDataProblemsDeleted: "Problems deleted",
      demoDataCoursesDeleted: "Courses deleted",
      demoDataGenerateSuccess: "Demo Data Generated Successfully",
      demoDataUsersCreated: "Users created",
      demoDataProblemsCreated: "Problems created",
      demoDataCoursesCreated: "Courses created",
      demoDataSkipped: "skipped",
      demoDataAdminUserCreated: "Admin User Created",
      demoDataUsername: "Username",
      demoDataEmail: "Email",
      demoDataPassword: "Password",
      demoDataPasswordWarning: "This password will only be shown once. Please save it now.",
      demoDataDemoUsersCreated: "Demo Users Created",
      demoDataPublicProblemsCreated: "Public Problems",
      demoDataExists: "exists",
      demoDataProblems: "Problems",
      demoDataMembers: "Members",
      demoDataHomeworks: "Homeworks",
      demoDataAnnouncements: "Announcements",
      demoDataConfirmGenerate: "Confirm Generate Demo Data",
      demoDataConfirmGenerateMessage: "This will create demo users, problems, courses, and other data. Existing demo data will be skipped. Are you sure?",
      demoDataConfirmClear: "Confirm Clear Demo Data",
      demoDataConfirmClearMessage: "This will permanently delete all demo users, problems, and courses. This action cannot be undone. Are you sure?",
      demoDataConfirmClearButton: "Yes, Clear All",
      cancel: "Cancel",
      confirm: "Confirm",
    };
  }, [locale]);

  const [status, setStatus] = useState<DemoDataStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<DemoDataResult | null>(null);
  const [clearResult, setClearResult] = useState<ClearDemoDataResult | null>(
    null
  );
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getDemoDataStatus(accessToken);
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch demo data status:", err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (accessToken) {
      fetchStatus();
    }
  }, [accessToken, fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t.loading}</div>
      </div>
    );
  }

  const isDemoAdmin = user?.username === "demo-admin";
  if (!user || (user.role !== "ADMIN" && !isDemoAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{t.demoDataForbidden}</div>
      </div>
    );
  }

  const handleGenerate = async () => {
    setShowConfirmGenerate(false);
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setClearResult(null);

    try {
      const data = await generateDemoData(accessToken!);
      setResult(data);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Failed to generate demo data");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = async () => {
    setShowConfirmClear(false);
    setIsClearing(true);
    setError(null);
    setResult(null);
    setClearResult(null);

    try {
      const data = await clearDemoData(accessToken!);
      setClearResult(data);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Failed to clear demo data");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-[#003865] hover:underline mb-4 inline-block"
        >
          &larr; {t.demoDataBackToAdmin}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{t.demoDataTitle}</h1>
        <p className="mt-2 text-gray-600">{t.demoDataDescription}</p>
      </div>

      {/* Current Status */}
      {status && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">{t.demoDataCurrentStatus}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-[#003865]">
                {status.hasAdminUser ? "1" : "0"}
              </div>
              <div className="text-sm text-gray-600">{t.demoDataAdminUser}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-[#003865]">
                {status.demoUserCount}
              </div>
              <div className="text-sm text-gray-600">{t.demoDataDemoUsers}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-[#003865]">
                {status.publicProblemCount}
              </div>
              <div className="text-sm text-gray-600">{t.demoDataPublicProblems}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-[#003865]">
                {status.courseCount}
              </div>
              <div className="text-sm text-gray-600">{t.demoDataCourses}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-8 flex flex-wrap gap-4">
        <button
          onClick={() => setShowConfirmGenerate(true)}
          disabled={isGenerating || isClearing}
          className="px-6 py-3 bg-[#003865] text-white rounded-lg hover:bg-[#1e5d8f] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isGenerating ? t.demoDataGenerating : t.demoDataGenerateButton}
        </button>
        <button
          onClick={() => setShowConfirmClear(true)}
          disabled={isGenerating || isClearing}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isClearing ? t.demoDataClearing : t.demoDataClearButton}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Clear Result */}
      {clearResult && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            {t.demoDataClearSuccess}
          </h3>
          <ul className="text-green-700">
            <li>{t.demoDataUsersDeleted}: {clearResult.usersDeleted}</li>
            <li>{t.demoDataProblemsDeleted}: {clearResult.problemsDeleted}</li>
            <li>{t.demoDataCoursesDeleted}: {clearResult.coursesDeleted}</li>
          </ul>
        </div>
      )}

      {/* Generation Result */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              {t.demoDataGenerateSuccess}
            </h3>
            <ul className="text-green-700">
              <li>
                {t.demoDataUsersCreated}: {result.summary.usersCreated} ({t.demoDataSkipped}: {result.summary.usersSkipped})
              </li>
              <li>
                {t.demoDataProblemsCreated}: {result.summary.problemsCreated} ({t.demoDataSkipped}: {result.summary.problemsSkipped})
              </li>
              <li>
                {t.demoDataCoursesCreated}: {result.summary.coursesCreated} ({t.demoDataSkipped}: {result.summary.coursesSkipped})
              </li>
            </ul>
          </div>

          {/* Admin User */}
          {result.adminUser.isNew && result.adminUser.password && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {t.demoDataAdminUserCreated}
              </h3>
              <div className="bg-white p-3 rounded border border-yellow-200">
                <p className="text-sm text-gray-600 mb-1">
                  {t.demoDataUsername}:{" "}
                  <span className="font-mono font-bold">{result.adminUser.username}</span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {t.demoDataEmail}:{" "}
                  <span className="font-mono font-bold">{result.adminUser.email}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {t.demoDataPassword}:{" "}
                  <span className="font-mono font-bold bg-yellow-100 px-2 py-1 rounded select-all">
                    {result.adminUser.password}
                  </span>
                </p>
              </div>
              <p className="mt-2 text-sm text-yellow-700 font-medium">
                {t.demoDataPasswordWarning}
              </p>
            </div>
          )}

          {/* Demo Users */}
          {result.demoUsers.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                {t.demoDataDemoUsersCreated}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        {t.demoDataUsername}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        {t.demoDataEmail}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        {t.demoDataPassword}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.demoUsers.map((demoUser, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2 font-mono text-sm">{demoUser.username}</td>
                        <td className="px-4 py-2 font-mono text-sm">{demoUser.email}</td>
                        <td className="px-4 py-2">
                          <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded select-all">
                            {demoUser.password}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-blue-700 font-medium">
                {t.demoDataPasswordWarning}
              </p>
            </div>
          )}

          {/* Public Problems */}
          {result.publicProblems.length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {t.demoDataPublicProblemsCreated}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {result.publicProblems.map((problem) => (
                  <div
                    key={problem.displayId}
                    className={`p-2 rounded border ${
                      problem.isNew
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <span className="font-mono font-bold">{problem.displayId}</span>
                    <span className="ml-2 text-sm text-gray-600">{problem.title}</span>
                    {!problem.isNew && (
                      <span className="ml-1 text-xs text-gray-400">({t.demoDataExists})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {result.courses.length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {t.demoDataCoursesCreated}
              </h3>
              <div className="space-y-2">
                {result.courses.map((course) => (
                  <div
                    key={course.slug}
                    className={`p-3 rounded border ${
                      course.isNew
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <div className="font-semibold">{course.name}</div>
                    <div className="text-sm text-gray-600">
                      {t.demoDataProblems}: {course.problemCount} | {t.demoDataMembers}: {course.memberCount} | {t.demoDataHomeworks}: {course.homeworkCount} | {t.demoDataAnnouncements}: {course.announcementCount}
                      {!course.isNew && (
                        <span className="ml-2 text-gray-400">({t.demoDataExists})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Generate Dialog */}
      {showConfirmGenerate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t.demoDataConfirmGenerate}</h3>
            <p className="text-gray-600 mb-6">{t.demoDataConfirmGenerateMessage}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmGenerate(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-[#003865] text-white rounded hover:bg-[#1e5d8f]"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">{t.demoDataConfirmClear}</h3>
            <p className="text-gray-600 mb-6">{t.demoDataConfirmClearMessage}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {t.demoDataConfirmClearButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
