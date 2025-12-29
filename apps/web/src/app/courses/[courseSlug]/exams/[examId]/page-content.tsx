'use client';

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import { useCourseExamDetail } from "@/hooks/useCourseExamDetail";
import { getApiBaseUrl } from "@/lib/api";
import { deleteCourseExam, deleteExamCode, regenerateExamCode, getExamCodes } from "@/lib/api/exam";
import type { ExamCode } from "@/types/exam";
import { ExamStatusBadge } from "../_components/exam-status-badge";

type Props = {
  courseSlug: string;
  examId: string;
};

export function ExamDetailPageContent({ courseSlug, examId }: Props) {
  const router = useRouter();
  const { accessToken, user, loading: authLoading } = useAuth();

  const {
    data: course,
    loading: courseLoading,
    unauthorized: courseUnauthorized,
    notFound: courseNotFound,
  } = useCourseDetail(courseSlug, accessToken);

  const {
    data: exam,
    loading: examLoading,
    error: examError,
    notFound: examNotFound,
    refetch: refetchExam,
  } = useCourseExamDetail(courseSlug, examId, accessToken);

  const [codes, setCodes] = useState<ExamCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const canManage = course?.myRole === "TEACHER" || course?.myRole === "TA";

  // Fetch codes
  const fetchCodes = useCallback(async () => {
    if (!accessToken) return;
    setCodesLoading(true);
    setCodesError(null);
    try {
      const data = await getExamCodes(courseSlug, examId, accessToken);
      setCodes(data);
    } catch (err) {
      setCodesError(err instanceof Error ? err.message : "無法載入代碼");
    } finally {
      setCodesLoading(false);
    }
  }, [accessToken, courseSlug, examId]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleRegenerateCode = async (code: string) => {
    if (!confirm(`確定要重新生成代碼 ${code}？舊代碼將立即失效。`)) return;
    setRegenerating(code);
    try {
      const newCode = await regenerateExamCode(courseSlug, examId, code, accessToken);
      setCodes(codes.map((c) => c.code === code ? newCode : c));
    } catch (err) {
      alert(err instanceof Error ? err.message : "重新生成失敗");
    } finally {
      setRegenerating(null);
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!confirm(`確定要刪除代碼 ${code}？`)) return;
    try {
      await deleteExamCode(courseSlug, examId, code, accessToken);
      fetchCodes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const handleDeleteExam = async () => {
    if (!confirm("確定要刪除這個考試？此操作無法復原。")) return;
    setDeleting(true);
    try {
      await deleteCourseExam(courseSlug, examId, accessToken);
      router.push(`/courses/${courseSlug}/exams`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "刪除失敗");
      setDeleting(false);
    }
  };

  const handleExportCodes = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/courses/${courseSlug}/exams/${examId}/codes/export`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("匯出失敗");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam-${examId}-codes.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "匯出失敗");
    }
  };

  if (courseNotFound || examNotFound) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        找不到考試
      </div>
    );
  }

  if (authLoading || courseLoading || examLoading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      </div>
    );
  }

  if (courseUnauthorized && !user) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        請先登入
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="px-4 py-10 text-sm text-gray-700">
        只有教師和助教可以查看考試詳情
      </div>
    );
  }

  if (examError) {
    return (
      <div className="px-4 py-10 text-sm text-red-700">
        {examError}
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-600">
            <Link href={`/courses/${courseSlug}/exams`} className="text-[#1e5d8f] hover:underline">
              &larr; 返回考試列表
            </Link>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#003865]">{exam.title}</h1>
              <ExamStatusBadge status={exam.status} />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/courses/${courseSlug}/exams/${examId}/edit`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                編輯
              </Link>
              <Link
                href={`/courses/${courseSlug}/exams/${examId}/scoreboard`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                成績
              </Link>
              <button
                onClick={handleDeleteExam}
                disabled={deleting}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "刪除中..." : "刪除"}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700">
            {new Date(exam.startsAt).toLocaleString()} ~ {new Date(exam.endsAt).toLocaleString()}
          </p>
          {exam.description && (
            <p className="mt-2 text-sm text-gray-600">{exam.description}</p>
          )}
        </div>

        {/* Codes Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">登入代碼</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCodes}
                disabled={codes.length === 0}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                匯出 CSV
              </button>
              <button
                onClick={fetchCodes}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                重新整理
              </button>
            </div>
          </div>

          {codesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-100" />
              ))}
            </div>
          ) : codesError ? (
            <p className="text-sm text-red-700">{codesError}</p>
          ) : codes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">代碼</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">學生</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">登入時間</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {codes.map((code) => (
                    <tr key={code.code}>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-gray-900">{code.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {code.studentUsername}{code.studentEmail ? ` (${code.studentEmail})` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {code.usedAt ? new Date(code.usedAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {code.usedIp || "-"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleRegenerateCode(code.code)}
                          disabled={regenerating === code.code}
                          className="text-xs text-[#1e5d8f] hover:text-[#003865] disabled:opacity-50"
                        >
                          {regenerating === code.code ? "生成中..." : "重新生成"}
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code.code)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">目前沒有學生成員，代碼會在學生加入課程時自動生成</p>
          )}
        </div>

        {/* IP Allow List */}
        {exam.ipAllowList.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">IP 白名單</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 font-mono">
              {exam.ipAllowList.map((ip, index) => (
                <li key={index}>{ip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
