'use client';

import { useEffect, useMemo, useState } from "react";
import { removeCourseMember, updateCourseMemberRole } from "@/lib/api/course-member";
import type { CourseMember } from "@/types/course";

type Props = {
  courseSlug: string;
  initialMembers: CourseMember[];
  accessToken?: string | null;
  currentUserId?: number | null;
  onMembersChange?: (members: CourseMember[]) => void;
  onError?: (message: string | null) => void;
};

const ROLE_LABELS: Record<CourseMember["role"], string> = {
  TEACHER: "教師",
  TA: "助教",
  STUDENT: "學生",
};

export function MembersTable({
  courseSlug,
  initialMembers,
  accessToken,
  currentUserId,
  onMembersChange,
  onError,
}: Props) {
  const [members, setMembers] = useState<CourseMember[]>(initialMembers);
  const [isBusy, setIsBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  useEffect(() => {
    onError?.(localError);
  }, [localError, onError]);

  const teacherCount = useMemo(
    () => members.filter((member) => member.role === "TEACHER").length,
    [members],
  );

  const formatDateTime = (value: string) => {
    try {
      return new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const handleRoleChange = async (member: CourseMember, role: CourseMember["role"]) => {
    if (role === member.role) return;
    setIsBusy(true);
    setLocalError(null);
    try {
      const updated = await updateCourseMemberRole(courseSlug, member.id, role, accessToken);
      setMembers(updated);
      onMembersChange?.(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新角色失敗，請稍後再試。";
      setLocalError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async (member: CourseMember) => {
    const ok = window.confirm("確定要將此成員移出課程嗎？");
    if (!ok) return;
    setIsBusy(true);
    setLocalError(null);
    try {
      const updated = await removeCourseMember(courseSlug, member.id, accessToken);
      setMembers(updated);
      onMembersChange?.(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "移除成員失敗，請稍後再試。";
      setLocalError(message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">使用者名稱</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">暱稱</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">角色</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">加入時間</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-600">
                  目前尚無成員。
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const canEditRole = member.canEditRole && member.userId !== currentUserId;
                const canRemove = member.canRemove && member.userId !== currentUserId;
                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{member.user.username}</td>
                    <td className="px-4 py-3 text-gray-800">{member.user.nickname ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {canEditRole ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as CourseMember["role"])}
                          disabled={isBusy}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
                        >
                          <option value="TEACHER">教師</option>
                          <option value="TA">助教</option>
                          <option value="STUDENT">學生</option>
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDateTime(member.joinedAt)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {canRemove ? (
                        <button
                          type="button"
                          onClick={() => handleRemove(member)}
                          disabled={isBusy || (member.role === "TEACHER" && teacherCount <= 1)}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                        >
                          移除
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
