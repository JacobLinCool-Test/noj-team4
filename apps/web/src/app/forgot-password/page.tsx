'use client';

import { FormEvent, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { apiRequest } from "@/lib/api";
import { Turnstile } from "@/components/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function ForgotPasswordPage() {
  const { messages } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        json: {
          identifier,
          turnstileToken: turnstileTokenRef.current || undefined,
        },
      });
      setSuccess(messages.forgotPasswordSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.errorGeneric;
      setError(message);
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
          <h1 className="text-xl font-semibold text-[#003865]">{messages.forgotPasswordTitle}</h1>
          <p className="mt-1 text-sm text-gray-700">{messages.forgotPasswordDescription}</p>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800" htmlFor="identifier">
              {messages.identifierLabel}
            </label>
            <input
              id="identifier"
              name="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
              placeholder="username or email"
              autoComplete="username"
            />
          </div>

          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
                onError={handleTurnstileError}
                action="forgot-password"
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
          <Link href="/login" className="font-medium text-[#1e5d8f] hover:underline">
            {messages.goLogin}
          </Link>{" "}
          ·{" "}
          <Link href="/register" className="font-medium text-[#1e5d8f] hover:underline">
            {messages.goRegister}
          </Link>
        </div>
      </div>
    </div>
  );
}
