'use client';

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { apiRequest } from "@/lib/api";

type VerifyState = "idle" | "processing" | "success" | "error";

export default function VerifyEmailPage() {
  const { messages } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [state, setState] = useState<VerifyState>(token ? "processing" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState(emailParam || "");
  const [resendLoading, setResendLoading] = useState(false);
  const [isResendExpanded, setIsResendExpanded] = useState(false);

  useEffect(() => {
    const runVerify = async () => {
      if (!token) return;
      setState("processing");
      setError(null);
      try {
        await apiRequest("/auth/verify-email", {
          method: "POST",
          json: { token },
        });
        setState("success");
      } catch (err) {
        setState("error");
        const message = err instanceof Error ? err.message : messages.errorGeneric;
        setError(message === "INVALID_VERIFICATION_TOKEN" ? messages.verifyFailed : message);
      }
    };
    void runVerify();
  }, [token, messages.errorGeneric, messages.verifyFailed]);

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResendLoading(true);
    setResendSuccess(null);
    setError(null);
    try {
      await apiRequest("/auth/resend-verification", {
        method: "POST",
        json: { identifier },
      });
      setResendSuccess(messages.resendSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.errorGeneric;
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-[#003865]">{messages.verifyTitle}</h1>
        </div>

        <div className="px-6 py-6 space-y-4">
          {state === "processing" ? (
            <p className="text-base text-gray-800">{messages.verifyProcessing}</p>
          ) : null}
          {state === "success" ? (
            <p className="text-base text-green-700">{messages.verifySuccess}</p>
          ) : null}
          {state === "error" ? (
            <p className="text-base text-red-600">{error ?? messages.verifyFailed}</p>
          ) : null}
          {state === "idle" ? (
            <p className="text-base text-gray-800">{messages.verificationEmailSent}</p>
          ) : null}
        </div>

        {state !== "success" && (
          <div className="border-t border-gray-200 px-6 py-4">
            {!isResendExpanded ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsResendExpanded(true)}
                  className="text-sm font-medium text-[#1e5d8f] hover:underline focus:outline-none"
                >
                  {messages.resendAction}
                </button>
                <Link href="/login" className="text-sm font-medium text-[#1e5d8f] hover:underline">
                  {messages.goLogin}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-800">{messages.resendVerification}</p>
                <form className="space-y-3" onSubmit={handleResend}>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#1e5d8f] focus:outline-none"
                    placeholder={messages.resendInputPlaceholder}
                    autoComplete="email"
                  />
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full rounded-md bg-[#003865] px-4 py-2 text-white transition hover:bg-[#1e5d8f] disabled:opacity-60"
                  >
                    {resendLoading ? `${messages.submit}...` : messages.resendAction}
                  </button>
                </form>
                <div className="text-right">
                  <Link href="/login" className="text-sm font-medium text-[#1e5d8f] hover:underline">
                    {messages.goLogin}
                  </Link>
                </div>
              </div>
            )}

            {resendSuccess ? <p className="mt-3 text-sm text-green-700">{resendSuccess}</p> : null}
            {error && state !== "error" ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
        )}

        {state === "success" && (
          <div className="border-t border-gray-200 px-6 py-4">
            <Link href="/login" className="font-medium text-[#1e5d8f] hover:underline">
              {messages.goLogin}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
