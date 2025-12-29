"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  getSystemConfig,
  updateSystemConfig,
  listPendingVerificationUsers,
  forceVerifyUser,
  listAdminActionLogs,
  type SystemConfig,
  type PendingVerificationUserListResponse,
  type AdminActionLogListResponse,
  type UpdateSystemConfigPayload,
} from "@/lib/api/admin";

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

function clampPage(page: number, totalPages: number) {
  return Math.max(1, Math.min(page, Math.max(1, totalPages)));
}

const DURATION_OPTIONS = [
  { label: "5 min", labelZh: "5 分鐘", minutes: 5 },
  { label: "10 min", labelZh: "10 分鐘", minutes: 10 },
  { label: "15 min", labelZh: "15 分鐘", minutes: 15 },
  { label: "30 min", labelZh: "30 分鐘", minutes: 30 },
  { label: "1 hour", labelZh: "1 小時", minutes: 60 },
  { label: "3 hours", labelZh: "3 小時", minutes: 180 },
  { label: "8 hours", labelZh: "8 小時", minutes: 480 },
  { label: "Permanent", labelZh: "永久", minutes: null },
];

export default function SystemSettingsPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { locale } = useI18n();
  const isZh = locale === "zh-TW";

  const t = useMemo(() => {
    if (isZh) {
      return {
        title: "系統設定",
        subtitle: "管理註冊、Email 發送及相關速率限制設定",
        loading: "載入中…",
        saving: "儲存中…",
        save: "儲存",
        reset: "重設為預設值",
        loginRequired: "請先登入。",
        forbidden: "您沒有權限檢視此頁面。",
        backHome: "回首頁",
        backToAdmin: "返回管理面板",
        // Emergency controls
        emergencyControls: "緊急控制",
        registrationFeature: "註冊功能",
        emailSendingFeature: "Email 發送功能",
        enabled: "已啟用",
        disabled: "已停用",
        enable: "啟用",
        disable: "停用",
        disableFor: "停用時間",
        status: "狀態",
        disabledUntil: "停用至",
        permanentlyDisabled: "永久停用",
        // Rate limits
        rateLimits: "Email 發送頻率限制",
        rateLimitsInfo: "這些設定用於防止 email 被濫發。數字越小限制越嚴格。",
        verifyEmailSection: "驗證信（註冊、重寄驗證信）",
        resetEmailSection: "密碼重設信",
        globalIpSection: "全站上限（防止大規模濫發）",
        globalIpInfo: "建議設高一點，以免影響共用網路的用戶（如大學 WiFi）",
        perRecipientLimit: "同一信箱最多收到",
        perUserLimit: "同一用戶最多觸發",
        perIpLimit: "同一 IP 最多寄出",
        emailsIn: "封 /",
        minutes: "分鐘",
        // Pending verification
        pendingVerification: "待驗證帳號",
        forceVerify: "強制通過",
        noData: "目前沒有資料。",
        colTime: "時間",
        colUser: "使用者",
        colEmail: "Email",
        colRole: "角色",
        colAction: "操作",
        page: "頁",
        of: " / ",
        prev: "上一頁",
        next: "下一頁",
        // Action logs
        actionLogs: "管理員操作紀錄",
        colAdmin: "管理員",
        colOperation: "操作",
        colTarget: "對象",
        colDetails: "詳情",
        colIp: "IP",
        viewMore: "查看更多",
        // Actions
        actionForceVerifyUser: "強制通過帳號",
        actionUpdateSystemConfig: "更新系統設定",
        actionDisableRegistration: "停用註冊功能",
        actionEnableRegistration: "啟用註冊功能",
        actionDisableEmailSending: "停用 Email 發送",
        actionEnableEmailSending: "啟用 Email 發送",
        actionUpdateRateLimits: "更新 Email 頻率限制",
        forDuration: "，時長：",
        permanently: "永久",
        saveSuccess: "設定已儲存",
        saveFailed: "儲存失敗",
        verifySuccess: "已強制通過",
        verifyFailed: "強制通過失敗",
      };
    }
    return {
      title: "System Settings",
      subtitle: "Manage registration, email sending, and rate limit settings",
      loading: "Loading...",
      saving: "Saving...",
      save: "Save",
      reset: "Reset to defaults",
      loginRequired: "Please sign in first.",
      forbidden: "You don't have permission to view this page.",
      backHome: "Back to home",
      backToAdmin: "Back to Admin",
      // Emergency controls
      emergencyControls: "Emergency Controls",
      registrationFeature: "Registration",
      emailSendingFeature: "Email Sending",
      enabled: "Enabled",
      disabled: "Disabled",
      enable: "Enable",
      disable: "Disable",
      disableFor: "Disable for",
      status: "Status",
      disabledUntil: "Disabled until",
      permanentlyDisabled: "Permanently disabled",
      // Rate limits
      rateLimits: "Email Rate Limits",
      rateLimitsInfo: "These settings prevent email abuse. Lower numbers = stricter limits.",
      verifyEmailSection: "Verification Email (Register, Resend)",
      resetEmailSection: "Password Reset Email",
      globalIpSection: "Global Limit (Prevent mass abuse)",
      globalIpInfo: "Set higher to avoid blocking shared networks (e.g., university WiFi)",
      perRecipientLimit: "Same recipient max",
      perUserLimit: "Same user max",
      perIpLimit: "Same IP max",
      emailsIn: "emails /",
      minutes: "min",
      // Pending verification
      pendingVerification: "Pending Verification",
      forceVerify: "Force Verify",
      noData: "No data yet.",
      colTime: "Time",
      colUser: "User",
      colEmail: "Email",
      colRole: "Role",
      colAction: "Action",
      page: "Page",
      of: " / ",
      prev: "Prev",
      next: "Next",
      // Action logs
      actionLogs: "Admin Action Logs",
      colAdmin: "Admin",
      colOperation: "Operation",
      colTarget: "Target",
      colDetails: "Details",
      colIp: "IP",
      viewMore: "View more",
      // Actions
      actionForceVerifyUser: "Force verified user",
      actionUpdateSystemConfig: "Updated system config",
      actionDisableRegistration: "Disabled registration",
      actionEnableRegistration: "Enabled registration",
      actionDisableEmailSending: "Disabled email sending",
      actionEnableEmailSending: "Enabled email sending",
      actionUpdateRateLimits: "Updated email rate limits",
      forDuration: ", duration: ",
      permanently: "permanent",
      saveSuccess: "Settings saved",
      saveFailed: "Failed to save",
      verifySuccess: "User verified",
      verifyFailed: "Failed to verify",
    };
  }, [isZh]);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  // State
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingVerificationUserListResponse | null>(null);
  const [actionLogs, setActionLogs] = useState<AdminActionLogListResponse | null>(null);

  const [configLoading, setConfigLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<number | null>(null);

  const [configError, setConfigError] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [pendingPage, setPendingPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // Form state for rate limits
  const [verifyTtl, setVerifyTtl] = useState<number | null>(null);
  const [verifyToLimit, setVerifyToLimit] = useState<number | null>(null);
  const [verifyIpLimit, setVerifyIpLimit] = useState<number | null>(null);
  const [resetTtl, setResetTtl] = useState<number | null>(null);
  const [resetToLimit, setResetToLimit] = useState<number | null>(null);
  const [resetIpLimit, setResetIpLimit] = useState<number | null>(null);
  const [globalIpTtl, setGlobalIpTtl] = useState<number | null>(null);
  const [globalIpLimit, setGlobalIpLimit] = useState<number | null>(null);

  // Emergency control state
  const [regDuration, setRegDuration] = useState<number | null>(5);
  const [emailDuration, setEmailDuration] = useState<number | null>(5);

  const loadConfig = useCallback(async () => {
    if (!accessToken) return;
    setConfigLoading(true);
    setConfigError(null);
    try {
      const data = await getSystemConfig(accessToken);
      setConfig(data);
      // Initialize form values from effective rate limits
      setVerifyTtl(Math.floor(data.emailRateLimits.verify.ttlSeconds / 60));
      setVerifyToLimit(data.emailRateLimits.verify.perRecipientLimit);
      setVerifyIpLimit(data.emailRateLimits.verify.perIpLimit);
      setResetTtl(Math.floor(data.emailRateLimits.reset.ttlSeconds / 60));
      setResetToLimit(data.emailRateLimits.reset.perRecipientLimit);
      setResetIpLimit(data.emailRateLimits.reset.perIpLimit);
      setGlobalIpTtl(Math.floor(data.emailRateLimits.globalIp.ttlSeconds / 60));
      setGlobalIpLimit(data.emailRateLimits.globalIp.limit);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setConfigLoading(false);
    }
  }, [accessToken]);

  const loadPendingUsers = useCallback(async (page: number) => {
    if (!accessToken) return;
    setPendingLoading(true);
    setPendingError(null);
    try {
      const data = await listPendingVerificationUsers({ page, limit: 10 }, accessToken);
      setPendingUsers(data);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setPendingLoading(false);
    }
  }, [accessToken]);

  const loadActionLogs = useCallback(async (page: number) => {
    if (!accessToken) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await listAdminActionLogs({ page, limit: 10 }, accessToken);
      setActionLogs(data);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLogsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) return;
    loadConfig();
    loadPendingUsers(pendingPage);
    loadActionLogs(logsPage);
  }, [authLoading, user, isAdmin, router, loadConfig, loadPendingUsers, loadActionLogs, pendingPage, logsPage]);

  const handleToggleRegistration = async (enable: boolean) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      let payload: UpdateSystemConfigPayload;
      if (enable) {
        payload = { registrationEnabled: true, registrationDisabledUntil: null };
      } else {
        const disabledUntil = regDuration !== null
          ? new Date(Date.now() + regDuration * 60 * 1000).toISOString()
          : null;
        payload = { registrationEnabled: false, registrationDisabledUntil: disabledUntil };
      }
      const data = await updateSystemConfig(payload, accessToken);
      setConfig(data);
      setSaveMessage({ type: "success", text: t.saveSuccess });
      loadActionLogs(1);
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEmailSending = async (enable: boolean) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      let payload: UpdateSystemConfigPayload;
      if (enable) {
        payload = { emailSendingEnabled: true, emailSendingDisabledUntil: null };
      } else {
        const disabledUntil = emailDuration !== null
          ? new Date(Date.now() + emailDuration * 60 * 1000).toISOString()
          : null;
        payload = { emailSendingEnabled: false, emailSendingDisabledUntil: disabledUntil };
      }
      const data = await updateSystemConfig(payload, accessToken);
      setConfig(data);
      setSaveMessage({ type: "success", text: t.saveSuccess });
      loadActionLogs(1);
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRateLimits = async () => {
    if (!accessToken || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload: UpdateSystemConfigPayload = {
        emailRlVerifyTtl: verifyTtl !== null ? verifyTtl * 60 : null,
        emailRlVerifyToLimit: verifyToLimit,
        emailRlVerifyIpLimit: verifyIpLimit,
        emailRlResetTtl: resetTtl !== null ? resetTtl * 60 : null,
        emailRlResetToLimit: resetToLimit,
        emailRlResetIpLimit: resetIpLimit,
        emailRlGlobalIpTtl: globalIpTtl !== null ? globalIpTtl * 60 : null,
        emailRlGlobalIpLimit: globalIpLimit,
      };
      const data = await updateSystemConfig(payload, accessToken);
      setConfig(data);
      setSaveMessage({ type: "success", text: t.saveSuccess });
      loadActionLogs(1);
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleResetRateLimits = async () => {
    if (!accessToken || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload: UpdateSystemConfigPayload = {
        emailRlVerifyTtl: null,
        emailRlVerifyToLimit: null,
        emailRlVerifyIpLimit: null,
        emailRlResetTtl: null,
        emailRlResetToLimit: null,
        emailRlResetIpLimit: null,
        emailRlGlobalIpTtl: null,
        emailRlGlobalIpLimit: null,
      };
      const data = await updateSystemConfig(payload, accessToken);
      setConfig(data);
      setVerifyTtl(Math.floor(data.emailRateLimits.verify.ttlSeconds / 60));
      setVerifyToLimit(data.emailRateLimits.verify.perRecipientLimit);
      setVerifyIpLimit(data.emailRateLimits.verify.perIpLimit);
      setResetTtl(Math.floor(data.emailRateLimits.reset.ttlSeconds / 60));
      setResetToLimit(data.emailRateLimits.reset.perRecipientLimit);
      setResetIpLimit(data.emailRateLimits.reset.perIpLimit);
      setGlobalIpTtl(Math.floor(data.emailRateLimits.globalIp.ttlSeconds / 60));
      setGlobalIpLimit(data.emailRateLimits.globalIp.limit);
      setSaveMessage({ type: "success", text: t.saveSuccess });
      loadActionLogs(1);
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleForceVerify = async (userId: number) => {
    if (!accessToken || verifying !== null) return;
    setVerifying(userId);
    setSaveMessage(null);
    try {
      await forceVerifyUser(userId, accessToken);
      setSaveMessage({ type: "success", text: t.verifySuccess });
      loadPendingUsers(pendingPage);
      loadActionLogs(1);
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : t.verifyFailed });
    } finally {
      setVerifying(null);
    }
  };

  const formatActionDescription = (action: string, details: Record<string, unknown> | null): string => {
    if (action === "FORCE_VERIFY_USER") {
      const username = details?.username as string | undefined;
      return username ? `${t.actionForceVerifyUser}: ${username}` : t.actionForceVerifyUser;
    }

    if (action === "UPDATE_SYSTEM_CONFIG" && details) {
      const parts: string[] = [];

      // Registration toggle
      if (details.registrationEnabled === false) {
        const until = details.registrationDisabledUntil as string | null;
        if (until) {
          const duration = formatDuration(until);
          parts.push(`${t.actionDisableRegistration}${t.forDuration}${duration}`);
        } else {
          parts.push(`${t.actionDisableRegistration}${t.forDuration}${t.permanently}`);
        }
      } else if (details.registrationEnabled === true) {
        parts.push(t.actionEnableRegistration);
      }

      // Email sending toggle
      if (details.emailSendingEnabled === false) {
        const until = details.emailSendingDisabledUntil as string | null;
        if (until) {
          const duration = formatDuration(until);
          parts.push(`${t.actionDisableEmailSending}${t.forDuration}${duration}`);
        } else {
          parts.push(`${t.actionDisableEmailSending}${t.forDuration}${t.permanently}`);
        }
      } else if (details.emailSendingEnabled === true) {
        parts.push(t.actionEnableEmailSending);
      }

      // Rate limit changes
      const rateLimitKeys = [
        "emailRlVerifyTtl", "emailRlVerifyToLimit", "emailRlVerifyIpLimit",
        "emailRlResetTtl", "emailRlResetToLimit", "emailRlResetIpLimit",
        "emailRlGlobalIpTtl", "emailRlGlobalIpLimit"
      ];
      const hasRateLimitChange = rateLimitKeys.some((key) => key in details);
      if (hasRateLimitChange) {
        parts.push(t.actionUpdateRateLimits);
      }

      if (parts.length > 0) {
        return parts.join("; ");
      }
      return t.actionUpdateSystemConfig;
    }

    return action;
  };

  const formatDuration = (isoDate: string): string => {
    const target = new Date(isoDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return "0m";

    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d`;
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
          {t.loginRequired}
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

  const pendingTotalPages = pendingUsers?.pagination.totalPages ?? 1;
  const logsTotalPages = actionLogs?.pagination.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-[#003865] hover:underline">
          &larr; {t.backToAdmin}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#003865]">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.subtitle}</p>
      </div>

      {saveMessage && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            saveMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Emergency Controls */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#003865]">{t.emergencyControls}</h2>

          {configError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {configError}
            </div>
          ) : configLoading && !config ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : config ? (
            <div className="space-y-6">
              {/* Registration */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{t.registrationFeature}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t.status}:{" "}
                      {config.registrationEnabled ? (
                        <span className="font-medium text-green-700">{t.enabled}</span>
                      ) : (
                        <>
                          <span className="font-medium text-red-700">{t.disabled}</span>
                          {config.registrationDisabledUntil ? (
                            <span className="ml-2 text-gray-500">
                              ({t.disabledUntil}: {formatDateTime(config.registrationDisabledUntil, locale)})
                            </span>
                          ) : (
                            <span className="ml-2 text-gray-500">({t.permanentlyDisabled})</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!config.registrationEnabled ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(true)}
                        disabled={saving}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {t.enable}
                      </button>
                    ) : (
                      <>
                        <select
                          value={regDuration === null ? "permanent" : String(regDuration)}
                          onChange={(e) => setRegDuration(e.target.value === "permanent" ? null : Number(e.target.value))}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.label} value={opt.minutes === null ? "permanent" : opt.minutes}>
                              {isZh ? opt.labelZh : opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleToggleRegistration(false)}
                          disabled={saving}
                          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {t.disable}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Sending */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{t.emailSendingFeature}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t.status}:{" "}
                      {config.emailSendingEnabled ? (
                        <span className="font-medium text-green-700">{t.enabled}</span>
                      ) : (
                        <>
                          <span className="font-medium text-red-700">{t.disabled}</span>
                          {config.emailSendingDisabledUntil ? (
                            <span className="ml-2 text-gray-500">
                              ({t.disabledUntil}: {formatDateTime(config.emailSendingDisabledUntil, locale)})
                            </span>
                          ) : (
                            <span className="ml-2 text-gray-500">({t.permanentlyDisabled})</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!config.emailSendingEnabled ? (
                      <button
                        type="button"
                        onClick={() => handleToggleEmailSending(true)}
                        disabled={saving}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {t.enable}
                      </button>
                    ) : (
                      <>
                        <select
                          value={emailDuration === null ? "permanent" : String(emailDuration)}
                          onChange={(e) => setEmailDuration(e.target.value === "permanent" ? null : Number(e.target.value))}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.label} value={opt.minutes === null ? "permanent" : opt.minutes}>
                              {isZh ? opt.labelZh : opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleToggleEmailSending(false)}
                          disabled={saving}
                          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {t.disable}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Rate Limits */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-[#003865]">{t.rateLimits}</h2>
          <p className="mb-4 text-sm text-gray-600">{t.rateLimitsInfo}</p>

          {config ? (
            <div className="space-y-6">
              {/* Verify Email */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 font-medium">{t.verifyEmailSection}</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{t.perRecipientLimit}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={verifyToLimit ?? ""}
                      onChange={(e) => setVerifyToLimit(e.target.value ? Number(e.target.value) : null)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.emailsIn}</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={verifyTtl ?? ""}
                      onChange={(e) => setVerifyTtl(e.target.value ? Number(e.target.value) : null)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.minutes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{t.perUserLimit}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={verifyIpLimit ?? ""}
                      onChange={(e) => setVerifyIpLimit(e.target.value ? Number(e.target.value) : null)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.emailsIn}</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={verifyTtl ?? ""}
                      disabled
                      className="w-16 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.minutes}</span>
                  </div>
                </div>
              </div>

              {/* Reset Email */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 font-medium">{t.resetEmailSection}</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{t.perRecipientLimit}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={resetToLimit ?? ""}
                      onChange={(e) => setResetToLimit(e.target.value ? Number(e.target.value) : null)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.emailsIn}</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={resetTtl ?? ""}
                      onChange={(e) => setResetTtl(e.target.value ? Number(e.target.value) : null)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.minutes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{t.perUserLimit}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={resetIpLimit ?? ""}
                      onChange={(e) => setResetIpLimit(e.target.value ? Number(e.target.value) : null)}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.emailsIn}</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={resetTtl ?? ""}
                      disabled
                      className="w-16 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-center"
                    />
                    <span className="text-gray-600">{t.minutes}</span>
                  </div>
                </div>
              </div>

              {/* Global IP */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="mb-1 font-medium">{t.globalIpSection}</div>
                <div className="mb-3 text-xs text-gray-500">{t.globalIpInfo}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">{t.perIpLimit}</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={globalIpLimit ?? ""}
                    onChange={(e) => setGlobalIpLimit(e.target.value ? Number(e.target.value) : null)}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-center"
                  />
                  <span className="text-gray-600">{t.emailsIn}</span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={globalIpTtl ?? ""}
                    onChange={(e) => setGlobalIpTtl(e.target.value ? Number(e.target.value) : null)}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center"
                  />
                  <span className="text-gray-600">{t.minutes}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveRateLimits}
                  disabled={saving}
                  className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#002a4a] disabled:opacity-50"
                >
                  {saving ? t.saving : t.save}
                </button>
                <button
                  type="button"
                  onClick={handleResetRateLimits}
                  disabled={saving}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.reset}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.loading}</div>
          )}
        </section>

        {/* Pending Verification Users */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#003865]">{t.pendingVerification}</h2>

          {pendingError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {pendingError}
            </div>
          ) : pendingLoading && !pendingUsers ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : pendingUsers?.users?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">{t.colTime}</th>
                    <th className="py-2 pr-3">{t.colUser}</th>
                    <th className="py-2 pr-3">{t.colEmail}</th>
                    <th className="py-2 pr-3">{t.colRole}</th>
                    <th className="py-2">{t.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingUsers.users.map((u) => (
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
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => handleForceVerify(u.id)}
                          disabled={verifying !== null}
                          className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {verifying === u.id ? t.saving : t.forceVerify}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.noData}</div>
          )}

          {pendingUsers && pendingUsers.pagination.total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {t.page} {pendingPage}
                {t.of}
                {pendingTotalPages}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pendingLoading || pendingPage <= 1}
                  onClick={() => setPendingPage((p) => clampPage(p - 1, pendingTotalPages))}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.prev}
                </button>
                <button
                  type="button"
                  disabled={pendingLoading || pendingPage >= pendingTotalPages}
                  onClick={() => setPendingPage((p) => clampPage(p + 1, pendingTotalPages))}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Admin Action Logs */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#003865]">{t.actionLogs}</h2>

          {logsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {logsError}
            </div>
          ) : logsLoading && !actionLogs ? (
            <div className="text-sm text-gray-600">{t.loading}</div>
          ) : actionLogs?.logs?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">{t.colTime}</th>
                    <th className="py-2 pr-3">{t.colAdmin}</th>
                    <th className="py-2 pr-3">{t.colOperation}</th>
                    <th className="py-2">{t.colIp}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {actionLogs.logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {formatDateTime(log.createdAt, locale)}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <Link href={`/users/${log.admin.username}`} className="text-[#003865] hover:underline">
                          {log.admin.username}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-xs">{formatActionDescription(log.action, log.details)}</td>
                      <td className="py-2 text-xs font-mono">{log.ip ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">{t.noData}</div>
          )}

          {actionLogs && actionLogs.pagination.total > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {t.page} {logsPage}
                {t.of}
                {logsTotalPages}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={logsLoading || logsPage <= 1}
                  onClick={() => setLogsPage((p) => clampPage(p - 1, logsTotalPages))}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.prev}
                </button>
                <button
                  type="button"
                  disabled={logsLoading || logsPage >= logsTotalPages}
                  onClick={() => setLogsPage((p) => clampPage(p + 1, logsTotalPages))}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
