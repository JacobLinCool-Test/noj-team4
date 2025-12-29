'use client';

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { apiRequest } from "@/lib/api";

export default function ResetPasswordPage() {
  const { messages } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenMissing(true);
    }
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setTokenMissing(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(messages.passwordMismatch);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        json: { token, newPassword },
      });
      // 清除可能殘留的 access token，避免舊會話繼續使用
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      setSuccess(messages.resetPasswordSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.errorGeneric;
      setError(message === "INVALID_PASSWORD_RESET_TOKEN" ? messages.resetPasswordInvalid : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-[#003865]">{messages.resetPasswordTitle}</h1>
          <p className="mt-1 text-sm text-gray-700">{messages.resetPasswordDescription}</p>
        </div>

        {tokenMissing ? (
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm text-red-600">{messages.resetPasswordMissingToken}</p>
            <Link href="/forgot-password" className="text-sm font-medium text-[#1e5d8f] hover:underline">
              {messages.forgotPasswordTitle}
            </Link>
          </div>
        ) : success ? (
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm text-green-700">{success}</p>
            <Link href="/login" className="text-sm font-medium text-[#1e5d8f] hover:underline">
              {messages.goLogin}
            </Link>
          </div>
        ) : (
          <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="newPassword">
                {messages.newPasswordLabel}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800" htmlFor="confirmPassword">
                {messages.confirmPasswordLabel}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
                autoComplete="new-password"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
            >
              {loading ? `${messages.submit}...` : messages.submit}
            </button>
          </form>
        )}

        {!success ? (
          <div className="border-t border-gray-200 px-6 py-4 text-sm text-gray-700">
            <Link href="/login" className="font-medium text-[#1e5d8f] hover:underline">
              {messages.goLogin}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
