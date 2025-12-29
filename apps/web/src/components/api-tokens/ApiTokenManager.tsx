"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  ApiToken,
  CreatedApiToken,
  TokenScope,
} from "@/lib/api/api-tokens";
import { getApiBaseUrl } from "@/lib/api";

// Scope 的顯示名稱和描述
const SCOPE_INFO: Record<
  TokenScope,
  { name: string; description: string; category: string }
> = {
  [TokenScope.READ_USER]: {
    name: "讀取個人資料",
    description: "查看使用者個人資料和統計資訊",
    category: "使用者",
  },
  [TokenScope.READ_COURSES]: {
    name: "讀取課程",
    description: "查看課程列表、作業和公告",
    category: "課程",
  },
  [TokenScope.WRITE_COURSES]: {
    name: "管理課程",
    description: "建立和管理課程、作業、公告",
    category: "課程",
  },
  [TokenScope.READ_PROBLEMS]: {
    name: "讀取題目",
    description: "查看題目內容和下載測試資料",
    category: "題目",
  },
  [TokenScope.WRITE_PROBLEMS]: {
    name: "管理題目",
    description: "建立和管理題目、上傳測試資料",
    category: "題目",
  },
  [TokenScope.READ_SUBMISSIONS]: {
    name: "讀取繳交紀錄",
    description: "查看繳交紀錄的詳細資訊和程式碼",
    category: "繳交",
  },
  [TokenScope.WRITE_SUBMISSIONS]: {
    name: "建立繳交",
    description: "建立新的繳交紀錄（提交程式碼）",
    category: "繳交",
  },
};

interface ApiTokenManagerProps {
  showBackLink?: boolean;
  backLinkHref?: string;
}

export default function ApiTokenManager({
  showBackLink = false,
  backLinkHref = "/profile",
}: ApiTokenManagerProps) {
  const { accessToken } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<CreatedApiToken | null>(
    null
  );
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // 創建 token 表單
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUsageGuide, setShowUsageGuide] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    scopes: [] as TokenScope[],
  });

  useEffect(() => {
    loadTokens();
  }, [accessToken]);

  const loadTokens = async () => {
    if (!accessToken) return;

    try {
      const data = await listApiTokens(accessToken);
      setTokens(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入 Token 失敗");
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (formData.scopes.length === 0) {
      setError("請至少選擇一個權限範圍");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const newToken = await createApiToken(formData, accessToken);
      setCreatedToken(newToken);
      setTokens([newToken, ...tokens]);
      setFormData({ name: "", scopes: [] });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立 Token 失敗");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: number) => {
    if (!accessToken) return;
    if (!confirm("確定要撤銷這個 Token 嗎？此操作無法復原。")) return;

    try {
      await revokeApiToken(tokenId, accessToken);
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "撤銷 Token 失敗");
    }
  };

  const toggleScope = (scope: TokenScope) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const copyToClipboard = async (text: string, commandId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCommand(commandId);
    setTimeout(() => setCopiedCommand(null), 2000);
  };


  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="skeleton-shimmer relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-6 w-48 rounded bg-gray-200/80" />
            <div className="h-20 w-full rounded bg-gray-200/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 返回按鈕 */}
      {showBackLink && (
        <div className="mb-4">
          <a
            href={backLinkHref}
            className="inline-flex items-center text-sm text-[#003865] hover:text-[#1e5d8f]"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回個人檔案
          </a>
        </div>
      )}

      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003865]">API 存取權杖</h1>
        <p className="mt-2 text-sm text-gray-600">
          個人存取權杖（Personal Access Token）可讓您的應用程式或腳本安全地存取
          API。
        </p>
      </div>

      {/* 顯示剛創建的 token（只顯示一次）*/}
      {createdToken && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="font-semibold text-green-900">Token 已建立</h3>
          </div>
          <p className="mb-3 text-sm text-green-800">
            請立即複製此 Token，它只會顯示這一次！
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white p-3 font-mono text-sm text-gray-900 break-all">
              {createdToken.token}
            </code>
            <button
              onClick={() => copyToClipboard(createdToken.token, "token")}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 shrink-0"
            >
              {copiedCommand === "token" ? "已複製!" : "複製"}
            </button>
          </div>

          {/* 使用範例 */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">
              快速開始 - 複製以下指令測試：
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white p-2 font-mono text-xs text-gray-700 overflow-x-auto">
                  curl -H &quot;Authorization: Bearer {createdToken.token}&quot; {getApiBaseUrl()}/auth/me
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -H "Authorization: Bearer ${createdToken.token}" ${getApiBaseUrl()}/auth/me`,
                      "curl-me"
                    )
                  }
                  className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 shrink-0"
                >
                  {copiedCommand === "curl-me" ? "已複製!" : "複製"}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCreatedToken(null)}
            className="mt-3 text-sm text-green-700 hover:text-green-900"
          >
            我已複製，關閉此訊息
          </button>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f]"
          >
            建立新的 Token
          </button>
        )}
        <button
          onClick={() => setShowUsageGuide(!showUsageGuide)}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
        >
          {showUsageGuide ? "隱藏使用說明" : "查看使用說明"}
        </button>
      </div>

      {/* 使用說明 */}
      {showUsageGuide && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            如何使用 API Token
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">1. 在 HTTP Header 中使用</h3>
              <p className="text-sm text-blue-700 mb-2">
                在每個 API 請求的 Header 中加入 Authorization：
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white p-2 font-mono text-xs text-gray-700">
                  Authorization: Bearer noj_pat_your_token_here
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">2. cURL 範例</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-blue-600 mb-1">查看個人資料：</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white p-2 font-mono text-xs text-gray-700 overflow-x-auto">
                      curl -H &quot;Authorization: Bearer $TOKEN&quot; {getApiBaseUrl()}/auth/me
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -H "Authorization: Bearer $TOKEN" ${getApiBaseUrl()}/auth/me`,
                          "example-me"
                        )
                      }
                      className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 shrink-0"
                    >
                      {copiedCommand === "example-me" ? "已複製!" : "複製"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-blue-600 mb-1">查看課程列表：</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white p-2 font-mono text-xs text-gray-700 overflow-x-auto">
                      curl -H &quot;Authorization: Bearer $TOKEN&quot; {getApiBaseUrl()}/courses
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -H "Authorization: Bearer $TOKEN" ${getApiBaseUrl()}/courses`,
                          "example-courses"
                        )
                      }
                      className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 shrink-0"
                    >
                      {copiedCommand === "example-courses" ? "已複製!" : "複製"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-blue-600 mb-1">查看繳交紀錄：</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white p-2 font-mono text-xs text-gray-700 overflow-x-auto">
                      curl -H &quot;Authorization: Bearer $TOKEN&quot; {getApiBaseUrl()}/submissions
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -H "Authorization: Bearer $TOKEN" ${getApiBaseUrl()}/submissions`,
                          "example-submissions"
                        )
                      }
                      className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 shrink-0"
                    >
                      {copiedCommand === "example-submissions" ? "已複製!" : "複製"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">3. Python 範例</h3>
              <div className="flex items-start gap-2">
                <pre className="flex-1 rounded bg-white p-2 font-mono text-xs text-gray-700 overflow-x-auto">
{`import requests

TOKEN = "noj_pat_your_token_here"
API_URL = "${getApiBaseUrl()}"

headers = {"Authorization": f"Bearer {TOKEN}"}

# 查看個人資料
response = requests.get(f"{API_URL}/auth/me", headers=headers)
print(response.json())

# 查看繳交紀錄
response = requests.get(f"{API_URL}/submissions", headers=headers)
print(response.json())`}
                </pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `import requests

TOKEN = "noj_pat_your_token_here"
API_URL = "${getApiBaseUrl()}"

headers = {"Authorization": f"Bearer {TOKEN}"}

# 查看個人資料
response = requests.get(f"{API_URL}/auth/me", headers=headers)
print(response.json())

# 查看繳交紀錄
response = requests.get(f"{API_URL}/submissions", headers=headers)
print(response.json())`,
                      "example-python"
                    )
                  }
                  className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 shrink-0"
                >
                  {copiedCommand === "example-python" ? "已複製!" : "複製"}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">4. 權限說明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {Object.entries(SCOPE_INFO).map(([scope, info]) => (
                  <div key={scope} className="flex items-start gap-2 bg-white rounded p-2">
                    <span className="font-mono text-blue-600 shrink-0">{scope}</span>
                    <span className="text-gray-600">{info.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 建立 token 表單 */}
      {showCreateForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#003865]">
              建立新的 API Token
            </h2>
          </div>

          <form className="space-y-6 px-6 py-6" onSubmit={handleCreateToken}>
            <div className="space-y-2">
              <label
                htmlFor="tokenName"
                className="text-sm font-medium text-gray-800"
              >
                Token 名稱
              </label>
              <input
                type="text"
                id="tokenName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
                maxLength={100}
                placeholder="例如：my-script-token"
                required
              />
              <p className="text-xs text-gray-500">
                請使用好記的名稱來識別此 Token 的用途
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-800">
                權限範圍（Scopes）
              </label>
              <p className="text-xs text-gray-500">
                選擇此 Token 可以執行的操作
              </p>

              <div className="space-y-2">
                {Object.entries(SCOPE_INFO).map(([scope, info]) => (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope as TokenScope)}
                      onChange={() => toggleScope(scope as TokenScope)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {info.name}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {info.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
              >
                {creating ? "建立中..." : "建立 Token"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: "", scopes: [] });
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Token 列表 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#003865]">
            你的 API Tokens
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {tokens.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              尚未建立任何 Token
            </div>
          ) : (
            tokens.map((token) => (
              <div key={token.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {token.name}
                      </h3>
                      {token.revokedAt && (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          已撤銷
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {token.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700"
                        >
                          {SCOPE_INFO[scope]?.name || scope}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      建立於{" "}
                      {new Date(token.createdAt).toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {token.lastUsedAt && (
                        <>
                          {" • 最後使用於 "}
                          {new Date(token.lastUsedAt).toLocaleDateString(
                            "zh-TW",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {!token.revokedAt && (
                    <button
                      onClick={() => handleRevokeToken(token.id)}
                      className="ml-4 rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      撤銷
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
