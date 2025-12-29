"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import { getAiConfigs, updateAiConfigs, type AiFeatureConfig } from "@/lib/api/admin";

type Provider = "OPENAI" | "GEMINI";
type ReasoningEffort = "NONE" | "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "XHIGH";

const REASONING_EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: "NONE", label: "None（不推理）" },
  { value: "MINIMAL", label: "Minimal（極少）" },
  { value: "LOW", label: "Low（低）" },
  { value: "MEDIUM", label: "Medium（中）" },
  { value: "HIGH", label: "High（高）" },
  { value: "XHIGH", label: "XHigh（極高）" },
];

const FEATURE_INFO: Record<string, { name: string; description: string }> = {
  ASSISTANT: {
    name: "AI 助教",
    description: "為學生提供程式碼提示與解題引導",
  },
  PROBLEM_CREATOR: {
    name: "AI 題目創建",
    description: "透過 AI 對話創建程式設計題目",
  },
  TESTDATA_GENERATOR: {
    name: "AI 測資生成",
    description: "根據題目描述自動生成測試資料",
  },
  TRANSLATOR: {
    name: "AI 翻譯器",
    description: "自動翻譯題目內容為中英雙語",
  },
  CODE_SAFETY_CHECK: {
    name: "程式碼安全檢查",
    description: "在提交前使用 AI 檢測惡意程式碼",
  },
};

export default function AdminAiSettingsPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { messages } = useI18n();

  const [forceDisabled, setForceDisabled] = useState(false);
  const [configs, setConfigs] = useState<AiFeatureConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin || !accessToken) return;
    setLoading(true);
    getAiConfigs(accessToken)
      .then((data) => {
        setForceDisabled(data.forceDisabled);
        setConfigs(data.configs);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : messages.adminAiError);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, isAdmin, accessToken, router, messages.adminAiError]);

  const updateConfig = (feature: string, updates: Partial<AiFeatureConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.feature === feature ? { ...c, ...updates } : c)),
    );
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateAiConfigs(
        {
          forceDisabled,
          configs: configs.map((c) => ({
            feature: c.feature,
            provider: c.provider,
            model: c.model,
            reasoningEffort: c.reasoningEffort,
            maxOutputTokens: c.maxOutputTokens,
            temperature: c.temperature,
            enabled: c.enabled,
          })),
        },
        accessToken,
      );
      setForceDisabled(result.forceDisabled);
      setConfigs(result.configs);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.adminAiError);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
            <div className="mt-8 h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {messages.adminAiError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {messages.adminAiBack}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{messages.adminAiTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{messages.adminAiSubtitle}</p>
        </div>

        {/* Global Settings Card */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <h2 className="font-medium text-gray-900">{messages.adminAiGlobalSettings || "全域設定"}</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {messages.adminAiForceDisable}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {messages.adminAiForceDisableHint || "啟用後將暫停所有 AI 功能的 API 呼叫"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForceDisabled(!forceDisabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  forceDisabled
                    ? "bg-red-500 focus:ring-red-500"
                    : "bg-gray-200 focus:ring-[#003865]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    forceDisabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        {configs.map((config) => {
          const info = FEATURE_INFO[config.feature] || {
            name: config.feature,
            description: "",
          };
          const showReasoning = config.provider === "OPENAI";

          return (
            <div
              key={config.feature}
              className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h3 className="font-medium text-gray-900">{info.name}</h3>
                  <p className="text-sm text-gray-500">{info.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {config.enabled ? messages.adminAiEnabled || "啟用" : messages.adminAiDisabled || "停用"}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateConfig(config.feature, { enabled: !config.enabled })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      config.enabled
                        ? "bg-[#003865] focus:ring-[#003865]"
                        : "bg-gray-200 focus:ring-[#003865]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Provider */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {messages.adminAiProvider || "供應商"}
                    </label>
                    <select
                      value={config.provider}
                      onChange={(e) =>
                        updateConfig(config.feature, { provider: e.target.value as Provider })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                    >
                      <option value="OPENAI">OpenAI</option>
                      <option value="GEMINI">Gemini</option>
                    </select>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {messages.adminAiModel || "模型名稱"}
                    </label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => updateConfig(config.feature, { model: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                      placeholder={config.provider === "OPENAI" ? "gpt-5.2" : "gemini-2.5-flash"}
                    />
                  </div>

                  {/* Reasoning Effort (OpenAI only) */}
                  {showReasoning && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {messages.adminAiReasoningEffort || "推理強度"}
                      </label>
                      <select
                        value={config.reasoningEffort}
                        onChange={(e) =>
                          updateConfig(config.feature, {
                            reasoningEffort: e.target.value as ReasoningEffort,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                      >
                        {REASONING_EFFORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Max Output Tokens */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {messages.adminAiMaxTokens}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={65536}
                      value={config.maxOutputTokens}
                      onChange={(e) =>
                        updateConfig(config.feature, {
                          maxOutputTokens: Number(e.target.value) || 512,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                      placeholder="512"
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {messages.adminAiTemperature}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={config.temperature}
                      onChange={(e) =>
                        updateConfig(config.feature, {
                          temperature: Number(e.target.value) || 0.4,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                      placeholder="0.4"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Save Button */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="text-sm">
            {error && <span className="text-red-600">{error}</span>}
            {success && (
              <span className="flex items-center gap-1.5 text-green-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {messages.adminAiSaved}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003865] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e5d8f] disabled:opacity-60"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {saving ? messages.adminAiSaving : messages.adminAiSave}
          </button>
        </div>
      </div>
    </div>
  );
}
