"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  listAdminUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  forceLogoutUser,
  forceVerifyUser,
  type AdminUser,
  type AdminUserListResponse,
} from "@/lib/api/admin";

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

function clampPage(page: number, totalPages: number) {
  return Math.max(1, Math.min(page, Math.max(1, totalPages)));
}

type ConfirmModal = {
  type: "delete" | "disable" | "enable" | "role" | "verify" | "logout";
  user: AdminUser;
  newRole?: "ADMIN" | "USER";
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { locale } = useI18n();

  const t = useMemo(() => {
    if (locale === "zh-TW") {
      return {
        title: "用戶管理",
        subtitle: "查看、搜尋、管理所有用戶帳號。",
        backToAdmin: "返回管理後台",
        loginRequired: "請先登入。",
        forbidden: "您沒有權限檢視此頁面。",
        loading: "載入中…",
        empty: "目前沒有資料。",
        prev: "上一頁",
        next: "下一頁",
        page: "頁",
        of: " / ",
        search: "搜尋用戶名、Email、暱稱…",
        filterRole: "角色",
        filterStatus: "狀態",
        all: "全部",
        colUser: "用戶",
        colEmail: "Email",
        colRole: "角色",
        colStatus: "狀態",
        colVerified: "驗證",
        colCreatedAt: "註冊時間",
        colActions: "操作",
        roleAdmin: "管理員",
        roleUser: "用戶",
        statusActive: "正常",
        statusDisabled: "停用",
        verified: "已驗證",
        notVerified: "未驗證",
        actionDisable: "停用",
        actionEnable: "啟用",
        actionMakeAdmin: "設為管理員",
        actionRemoveAdmin: "移除管理員",
        actionForceVerify: "強制驗證",
        actionForceLogout: "強制登出",
        actionDelete: "刪除",
        confirmTitle: "確認操作",
        confirmDelete: "確定要刪除用戶",
        confirmDeleteWarn: "此操作無法復原，但用戶名和 Email 可被再次使用。",
        confirmDisable: "確定要停用用戶",
        confirmDisableWarn: "該用戶將無法登入系統。",
        confirmEnable: "確定要啟用用戶",
        confirmEnableWarn: "該用戶將恢復正常使用。",
        confirmMakeAdmin: "確定要將用戶設為管理員",
        confirmMakeAdminWarn: "該用戶將獲得系統管理權限。",
        confirmRemoveAdmin: "確定要移除用戶的管理員權限",
        confirmRemoveAdminWarn: "該用戶將失去系統管理權限。",
        confirmVerify: "確定要強制驗證用戶",
        confirmVerifyWarn: "該用戶的 Email 將被標記為已驗證。",
        confirmLogout: "確定要強制登出用戶",
        confirmLogoutWarn: "該用戶的所有登入 Token 將被撤銷。",
        disableReason: "停用原因（選填）",
        cancel: "取消",
        confirm: "確認",
        success: "操作成功",
        error: "操作失敗",
        cannotModifySelf: "無法對自己執行此操作",
      };
    }
    return {
      title: "User Management",
      subtitle: "View, search, and manage all user accounts.",
      backToAdmin: "Back to Admin",
      loginRequired: "Please sign in first.",
      forbidden: "You don't have permission to view this page.",
      loading: "Loading…",
      empty: "No data yet.",
      prev: "Prev",
      next: "Next",
      page: "Page",
      of: " / ",
      search: "Search username, email, nickname…",
      filterRole: "Role",
      filterStatus: "Status",
      all: "All",
      colUser: "User",
      colEmail: "Email",
      colRole: "Role",
      colStatus: "Status",
      colVerified: "Verified",
      colCreatedAt: "Registered",
      colActions: "Actions",
      roleAdmin: "Admin",
      roleUser: "User",
      statusActive: "Active",
      statusDisabled: "Disabled",
      verified: "Verified",
      notVerified: "Not Verified",
      actionDisable: "Disable",
      actionEnable: "Enable",
      actionMakeAdmin: "Make Admin",
      actionRemoveAdmin: "Remove Admin",
      actionForceVerify: "Force Verify",
      actionForceLogout: "Force Logout",
      actionDelete: "Delete",
      confirmTitle: "Confirm Action",
      confirmDelete: "Are you sure you want to delete user",
      confirmDeleteWarn: "This action cannot be undone, but the username and email can be reused.",
      confirmDisable: "Are you sure you want to disable user",
      confirmDisableWarn: "The user will not be able to log in.",
      confirmEnable: "Are you sure you want to enable user",
      confirmEnableWarn: "The user will be able to use the system normally.",
      confirmMakeAdmin: "Are you sure you want to make user an admin",
      confirmMakeAdminWarn: "The user will gain system admin privileges.",
      confirmRemoveAdmin: "Are you sure you want to remove admin privileges from user",
      confirmRemoveAdminWarn: "The user will lose system admin privileges.",
      confirmVerify: "Are you sure you want to force verify user",
      confirmVerifyWarn: "The user's email will be marked as verified.",
      confirmLogout: "Are you sure you want to force logout user",
      confirmLogoutWarn: "All of the user's login tokens will be revoked.",
      disableReason: "Disable reason (optional)",
      cancel: "Cancel",
      confirm: "Confirm",
      success: "Operation successful",
      error: "Operation failed",
      cannotModifySelf: "Cannot perform this action on yourself",
    };
  }, [locale]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ADMIN" | "USER" | "">("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "DISABLED" | "">("");

  const [users, setUsers] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  const loadUsers = useCallback(
    async (p: number) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const data = await listAdminUsers(
          {
            page: p,
            limit: 20,
            search: search || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
          },
          accessToken,
        );
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, search, roleFilter, statusFilter],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) return;
    loadUsers(page);
  }, [authLoading, user, isAdmin, router, loadUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers(1);
  };

  const openConfirm = (type: ConfirmModal["type"], targetUser: AdminUser, newRole?: "ADMIN" | "USER") => {
    if (targetUser.id === user?.id) {
      setActionMessage({ type: "error", text: t.cannotModifySelf });
      return;
    }
    setConfirmModal({ type, user: targetUser, newRole });
    setDisableReason("");
    setActionMessage(null);
  };

  const closeConfirm = () => {
    setConfirmModal(null);
    setDisableReason("");
  };

  const executeAction = async () => {
    if (!confirmModal || !accessToken) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      switch (confirmModal.type) {
        case "delete":
          await deleteUser(confirmModal.user.id, accessToken);
          break;
        case "disable":
          await updateUserStatus(confirmModal.user.id, "DISABLED", disableReason || undefined, accessToken);
          break;
        case "enable":
          await updateUserStatus(confirmModal.user.id, "ACTIVE", undefined, accessToken);
          break;
        case "role":
          if (confirmModal.newRole) {
            await updateUserRole(confirmModal.user.id, confirmModal.newRole, accessToken);
          }
          break;
        case "verify":
          await forceVerifyUser(confirmModal.user.id, accessToken);
          break;
        case "logout":
          await forceLogoutUser(confirmModal.user.id, accessToken);
          break;
      }
      setActionMessage({ type: "success", text: t.success });
      closeConfirm();
      loadUsers(page);
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : t.error });
    } finally {
      setActionLoading(false);
    }
  };

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
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = users?.pagination.totalPages ?? 1;

  const getConfirmMessage = () => {
    if (!confirmModal) return { title: "", warn: "" };
    const username = confirmModal.user.username;
    switch (confirmModal.type) {
      case "delete":
        return { title: `${t.confirmDelete} "${username}"?`, warn: t.confirmDeleteWarn };
      case "disable":
        return { title: `${t.confirmDisable} "${username}"?`, warn: t.confirmDisableWarn };
      case "enable":
        return { title: `${t.confirmEnable} "${username}"?`, warn: t.confirmEnableWarn };
      case "role":
        if (confirmModal.newRole === "ADMIN") {
          return { title: `${t.confirmMakeAdmin} "${username}"?`, warn: t.confirmMakeAdminWarn };
        }
        return { title: `${t.confirmRemoveAdmin} "${username}"?`, warn: t.confirmRemoveAdminWarn };
      case "verify":
        return { title: `${t.confirmVerify} "${username}"?`, warn: t.confirmVerifyWarn };
      case "logout":
        return { title: `${t.confirmLogout} "${username}"?`, warn: t.confirmLogoutWarn };
      default:
        return { title: "", warn: "" };
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-[#003865] hover:underline">
          &larr; {t.backToAdmin}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#003865]">{t.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{t.subtitle}</p>
      </div>

      {actionMessage && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            >
              <option value="">{t.filterRole}: {t.all}</option>
              <option value="ADMIN">{t.roleAdmin}</option>
              <option value="USER">{t.roleUser}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            >
              <option value="">{t.filterStatus}: {t.all}</option>
              <option value="ACTIVE">{t.statusActive}</option>
              <option value="DISABLED">{t.statusDisabled}</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#002a4a]"
            >
              {locale === "zh-TW" ? "搜尋" : "Search"}
            </button>
          </div>
        </form>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : loading && !users ? (
          <div className="text-sm text-gray-600">{t.loading}</div>
        ) : users?.users?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="py-2 pr-3">{t.colUser}</th>
                  <th className="py-2 pr-3">{t.colEmail}</th>
                  <th className="py-2 pr-3">{t.colRole}</th>
                  <th className="py-2 pr-3">{t.colStatus}</th>
                  <th className="py-2 pr-3">{t.colVerified}</th>
                  <th className="py-2 pr-3">{t.colCreatedAt}</th>
                  <th className="py-2">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.users.map((u) => (
                  <tr key={u.id} className="align-top">
                    <td className="py-2 pr-3">
                      <Link href={`/users/${u.username}`} className="text-[#003865] hover:underline">
                        {u.username}
                      </Link>
                      {u.nickname && (
                        <div className="text-xs text-gray-500">{u.nickname}</div>
                      )}
                      <div className="text-xs text-gray-400">#{u.id}</div>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{u.email}</td>
                    <td className="py-2 pr-3 text-xs">
                      <span
                        className={`rounded px-2 py-1 ${
                          u.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {u.role === "ADMIN" ? t.roleAdmin : t.roleUser}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <span
                        className={`rounded px-2 py-1 ${
                          u.status === "ACTIVE"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {u.status === "ACTIVE" ? t.statusActive : t.statusDisabled}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {u.emailVerifiedAt ? (
                        <span className="rounded bg-green-50 px-2 py-1 text-green-700">{t.verified}</span>
                      ) : (
                        <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-700">{t.notVerified}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600">
                      {formatDateTime(u.createdAt, locale)}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.status === "ACTIVE" ? (
                          <button
                            type="button"
                            onClick={() => openConfirm("disable", u)}
                            className="rounded border border-yellow-300 bg-yellow-50 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-100"
                          >
                            {t.actionDisable}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConfirm("enable", u)}
                            className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                          >
                            {t.actionEnable}
                          </button>
                        )}
                        {u.role === "ADMIN" ? (
                          <button
                            type="button"
                            onClick={() => openConfirm("role", u, "USER")}
                            className="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            {t.actionRemoveAdmin}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConfirm("role", u, "ADMIN")}
                            className="rounded border border-purple-300 bg-purple-50 px-2 py-1 text-xs text-purple-700 hover:bg-purple-100"
                          >
                            {t.actionMakeAdmin}
                          </button>
                        )}
                        {!u.emailVerifiedAt && (
                          <button
                            type="button"
                            onClick={() => openConfirm("verify", u)}
                            className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            {t.actionForceVerify}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openConfirm("logout", u)}
                          className="rounded border border-orange-300 bg-orange-50 px-2 py-1 text-xs text-orange-700 hover:bg-orange-100"
                        >
                          {t.actionForceLogout}
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirm("delete", u)}
                          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                        >
                          {t.actionDelete}
                        </button>
                      </div>
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
            {t.page} {page}
            {t.of}
            {totalPages}
            {users?.pagination.total !== undefined && (
              <span className="ml-2">({users.pagination.total} total)</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => clampPage(p - 1, totalPages))}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {t.prev}
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => clampPage(p + 1, totalPages))}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {t.next}
            </button>
          </div>
        </div>
      </section>

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">{t.confirmTitle}</h3>
            <div className="mt-4">
              <p className="text-sm text-gray-700">{getConfirmMessage().title}</p>
              <p className="mt-2 text-xs text-gray-500">{getConfirmMessage().warn}</p>
            </div>

            {confirmModal.type === "disable" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t.disableReason}
                </label>
                <textarea
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                />
              </div>
            )}

            {actionMessage && (
              <div
                className={`mt-4 rounded-md border p-2 text-xs ${
                  actionMessage.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {actionMessage.text}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={actionLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={executeAction}
                disabled={actionLoading}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  confirmModal.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#003865] hover:bg-[#002a4a]"
                }`}
              >
                {actionLoading ? t.loading : t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
