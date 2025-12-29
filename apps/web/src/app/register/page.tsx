'use client';

import { FormEvent, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { PasswordInput } from "@/components/PasswordInput";
import { useBlockChineseInput } from "@/hooks/useBlockChineseInput";
import { Turnstile } from "@/components/Turnstile";

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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function RegisterPage() {
  const { messages } = useI18n();
  const router = useRouter();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isComposing, handleCompositionStart, handleCompositionEnd, handleChange } = useBlockChineseInput();

  // Turnstile state
  const turnstileTokenRef = useRef<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(!TURNSTILE_SITE_KEY);

  const handleTurnstileVerify = useCallback((token: string) => {
    turnstileTokenRef.current = token;
    setTurnstileReady(true);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    turnstileTokenRef.current = null;
    setTurnstileReady(false);
  }, []);

  const handleTurnstileError = useCallback(() => {
    turnstileTokenRef.current = null;
    setTurnstileReady(false);
  }, []);

  // Handle username input: auto-convert to lowercase and filter invalid characters
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase() // Convert uppercase to lowercase
      .replace(/[^a-z0-9._]/g, ''); // Only allow lowercase letters, numbers, periods, underscores
    setUsername(value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        json: {
          username,
          email,
          password,
          turnstileToken: turnstileTokenRef.current || undefined,
        },
      });
      localStorage.setItem("accessToken", data.accessToken);
      await refresh().catch(() => null);
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.errorGeneric);
      // Reset turnstile on error (token is single-use)
      setTurnstileReady(!TURNSTILE_SITE_KEY);
      turnstileTokenRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-[#003865]">{messages.registerTitle}</h1>
        </div>
        <form className="px-6 py-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800" htmlFor="username">
              {messages.usernameLabel}
            </label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={handleUsernameChange}
              required
              minLength={3}
              maxLength={30}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
              placeholder="username"
              autoComplete="username"
            />
            <p className="text-xs text-gray-500">{messages.usernameHint}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800" htmlFor="email">
              {messages.emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => handleChange(e, setEmail)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
              placeholder="username@gmail.com"
              autoComplete="email"
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
            autoComplete="new-password"
            minLength={8}
            toggleLabels={{ show: messages.showPassword, hide: messages.hidePassword }}
            inputMethodWarning={messages.inputMethodWarning}
          />

          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center pt-2">
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
                onError={handleTurnstileError}
                action="register"
              />
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}

          <button
            type="submit"
            disabled={loading || !turnstileReady}
            className="w-full rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
          >
            {loading ? `${messages.submit}...` : messages.submit}
          </button>
        </form>
        <div className="border-t border-gray-200 px-6 py-4 text-sm text-gray-700">
          {messages.haveAccount}{" "}
          <Link href="/login" className="font-medium text-[#1e5d8f] hover:underline">
            {messages.goLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
