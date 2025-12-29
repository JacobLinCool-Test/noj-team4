"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  listAllowedDomains,
  createAllowedDomain,
  updateAllowedDomain,
  deleteAllowedDomain,
  listBlockedDomains,
  createBlockedDomain,
  updateBlockedDomain,
  deleteBlockedDomain,
  getBlocklistStats,
  type EmailDomain,
  type Pagination,
} from "@/lib/api/admin";

type Tab = "allowed" | "blocked";

type EditingDomain = {
  id: number;
  domain: string;
  note: string;
  enabled: boolean;
};

export default function AdminEmailDomainsPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { messages: t } = useI18n();

  const [activeTab, setActiveTab] = useState<Tab>("allowed");
  const [allowedDomains, setAllowedDomains] = useState<EmailDomain[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<EmailDomain[]>([]);
  const [allowedPagination, setAllowedPagination] = useState<Pagination | null>(null);
  const [blockedPagination, setBlockedPagination] = useState<Pagination | null>(null);
  const [blocklistStats, setBlocklistStats] = useState<{ count: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New domain form
  const [newDomain, setNewDomain] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Editing state
  const [editingDomain, setEditingDomain] = useState<EditingDomain | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const [allowedRes, blockedRes, statsRes] = await Promise.all([
        listAllowedDomains({ limit: 100 }, accessToken),
        listBlockedDomains({ limit: 100 }, accessToken),
        getBlocklistStats(accessToken),
      ]);
      setAllowedDomains(allowedRes.domains);
      setAllowedPagination(allowedRes.pagination);
      setBlockedDomains(blockedRes.domains);
      setBlockedPagination(blockedRes.pagination);
      setBlocklistStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.errorGeneric]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin || !accessToken) return;
    fetchData();
  }, [authLoading, user, isAdmin, accessToken, router, fetchData]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAdd = async () => {
    if (!accessToken || !newDomain.trim()) return;
    setIsAdding(true);
    setError(null);

    try {
      if (activeTab === "allowed") {
        await createAllowedDomain({ domain: newDomain.trim(), note: newNote.trim() || undefined }, accessToken);
      } else {
        await createBlockedDomain({ domain: newDomain.trim(), note: newNote.trim() || undefined }, accessToken);
      }
      setNewDomain("");
      setNewNote("");
      showSuccess(t.emailDomainsAddedSuccess);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleEnabled = async (domain: EmailDomain) => {
    if (!accessToken) return;
    setError(null);

    try {
      if (activeTab === "allowed") {
        await updateAllowedDomain(domain.id, { enabled: !domain.enabled }, accessToken);
      } else {
        await updateBlockedDomain(domain.id, { enabled: !domain.enabled }, accessToken);
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken) return;
    if (!confirm(t.emailDomainsDeleteConfirm)) return;
    setError(null);

    try {
      if (activeTab === "allowed") {
        await deleteAllowedDomain(id, accessToken);
      } else {
        await deleteBlockedDomain(id, accessToken);
      }
      showSuccess(t.emailDomainsDeletedSuccess);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    }
  };

  const handleEdit = (domain: EmailDomain) => {
    setEditingDomain({
      id: domain.id,
      domain: domain.domain,
      note: domain.note || "",
      enabled: domain.enabled,
    });
  };

  const handleSaveEdit = async () => {
    if (!accessToken || !editingDomain) return;
    setIsSaving(true);
    setError(null);

    try {
      if (activeTab === "allowed") {
        await updateAllowedDomain(
          editingDomain.id,
          { domain: editingDomain.domain, note: editingDomain.note || undefined, enabled: editingDomain.enabled },
          accessToken,
        );
      } else {
        await updateBlockedDomain(
          editingDomain.id,
          { domain: editingDomain.domain, note: editingDomain.note || undefined, enabled: editingDomain.enabled },
          accessToken,
        );
      }
      setEditingDomain(null);
      showSuccess(t.emailDomainsUpdatedSuccess);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setIsSaving(false);
    }
  };

  const currentDomains = activeTab === "allowed" ? allowedDomains : blockedDomains;
  const currentPagination = activeTab === "allowed" ? allowedPagination : blockedPagination;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-5xl px-4 py-12">
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
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t.emailDomainsAccessDenied}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.emailDomainsBackToAdmin}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{t.emailDomainsTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.emailDomainsSubtitle}</p>
        </div>

        {/* Stats Card */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-[#003865]">{allowedPagination?.total ?? 0}</div>
            <div className="text-sm text-gray-500">{t.emailDomainsAllowedCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-orange-600">{blockedPagination?.total ?? 0}</div>
            <div className="text-sm text-gray-500">{t.emailDomainsBlockedCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold text-red-600">{blocklistStats?.count ?? 0}</div>
            <div className="text-sm text-gray-500">{t.emailDomainsDisposableCount}</div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="font-medium mb-1">{t.emailDomainsHowItWorksTitle}</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>{t.emailDomainsHowItWorks1}</li>
            <li>{t.emailDomainsHowItWorks2}</li>
            <li>{t.emailDomainsHowItWorks3}</li>
            <li>{t.emailDomainsHowItWorks4}</li>
          </ol>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab("allowed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "allowed"
                ? "bg-[#003865] text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.emailDomainsTabAllowed} ({allowedPagination?.total ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "blocked"
                ? "bg-orange-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.emailDomainsTabBlocked} ({blockedPagination?.total ?? 0})
          </button>
        </div>

        {/* Add Form */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-3">
            {activeTab === "allowed" ? t.emailDomainsAddAllowed : t.emailDomainsAddBlocked}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={t.emailDomainsDomainPlaceholder}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            />
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t.emailDomainsNotePlaceholder}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            />
            <button
              onClick={handleAdd}
              disabled={isAdding || !newDomain.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#003865] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e5d8f] disabled:opacity-60"
            >
              {isAdding && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {t.emailDomainsAdd}
            </button>
          </div>
        </div>

        {/* Domain List */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.emailDomainsColDomain}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.emailDomainsColNote}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.emailDomainsColEnabled}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.emailDomainsColActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentDomains.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    {t.emailDomainsEmpty}
                  </td>
                </tr>
              ) : (
                currentDomains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {editingDomain?.id === domain.id ? (
                        <input
                          type="text"
                          value={editingDomain.domain}
                          onChange={(e) => setEditingDomain({ ...editingDomain, domain: e.target.value })}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none"
                        />
                      ) : (
                        <span className={!domain.enabled ? "text-gray-400" : ""}>{domain.domain}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {editingDomain?.id === domain.id ? (
                        <input
                          type="text"
                          value={editingDomain.note}
                          onChange={(e) => setEditingDomain({ ...editingDomain, note: e.target.value })}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none"
                        />
                      ) : (
                        <span className={!domain.enabled ? "text-gray-300" : ""}>{domain.note || "-"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleEnabled(domain)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          domain.enabled ? "bg-green-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            domain.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingDomain?.id === domain.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            {t.emailDomainsSave}
                          </button>
                          <button
                            onClick={() => setEditingDomain(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            {t.emailDomainsCancel}
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(domain)}
                            className="text-sm text-[#003865] hover:text-[#1e5d8f]"
                          >
                            {t.emailDomainsEdit}
                          </button>
                          <button
                            onClick={() => handleDelete(domain.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            {t.emailDomainsDelete}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Info */}
          {currentPagination && currentPagination.total > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              {t.emailDomainsShowing
                .replace("{count}", String(currentDomains.length))
                .replace("{total}", String(currentPagination.total))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
