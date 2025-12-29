'use client';

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { PasswordInput } from "@/components/PasswordInput";
import { useBlockChineseInput } from "@/hooks/useBlockChineseInput";

type AuthResponse = {
  accessToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    emailVerifiedAt: string | null;
  };
};

export default function LoginPage() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  // Get redirect URL from query params, default to home
  const nextUrl = searchParams.get("next") || "/";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const { isComposing, handleCompositionStart, handleCompositionEnd, handleChange } = useBlockChineseInput();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setUnverified(false);
    try {
      const data = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        json: {
          identifier,
          password,
        },
      });
      localStorage.setItem("accessToken", data.accessToken);
      await refresh().catch(() => null);
      setSuccess(messages.successLogin);
      setTimeout(() => router.push(nextUrl), 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.errorGeneric;
      if (message === "EMAIL_NOT_VERIFIED") {
        setUnverified(true);
        setError(messages.emailNotVerified);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-[#003865]">{messages.loginTitle}</h1>
        </div>
        <form className="px-6 py-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800" htmlFor="identifier">
              {messages.identifierLabel}
            </label>
            <input
              id="identifier"
              name="identifier"
              value={identifier}
              onChange={(e) => handleChange(e, setIdentifier)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
              placeholder="username or email"
              autoComplete="username"
            />
            {isComposing && (
              <p className="text-sm text-amber-600">{messages.inputMethodWarning}</p>
            )}
          </div>

          <PasswordInput
            id="password"
            label={messages.passwordLabel}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            toggleLabels={{ show: messages.showPassword, hide: messages.hidePassword }}
            inputMethodWarning={messages.inputMethodWarning}
          />

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-[#1e5d8f] hover:underline">
              {messages.forgotPassword}
            </Link>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {unverified ? (
            <p className="text-sm text-[#003865]">
              <Link href="/verify-email" className="font-medium text-[#1e5d8f] hover:underline">
                {messages.goVerify}
              </Link>
            </p>
          ) : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
          >
            {loading ? `${messages.submit}...` : messages.submit}
          </button>
        </form>
        <div className="border-t border-gray-200 px-6 py-4 text-sm text-gray-700">
          {messages.noAccount}{" "}
          <Link href="/register" className="font-medium text-[#1e5d8f] hover:underline">
            {messages.goRegister}
          </Link>
        </div>
      </div>
    </div>
  );
}
