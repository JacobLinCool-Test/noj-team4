"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n/useI18n";
import {
  listCoursesForSelection,
  bulkCreateUsers,
  type CourseForSelection,
  type BulkCreateUsersPayload,
  type BulkCreateUsersResult,
} from "@/lib/api/admin";

type PasswordMode = "specified" | "random";

export default function AdminBulkCreateUsersPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { messages: t } = useI18n();

  const [courses, setCourses] = useState<CourseForSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [emailsText, setEmailsText] = useState("");
  const [autoVerify, setAutoVerify] = useState(true);
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("random");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkCreateUsersResult | null>(null);

  const isDemoAdmin = user?.username === "demo-admin";
  const isAdmin = user?.role === "ADMIN" || isDemoAdmin;

  const fetchCourses = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const coursesData = await listCoursesForSelection(accessToken);
      setCourses(coursesData);
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
    fetchCourses();
  }, [authLoading, user, isAdmin, accessToken, router, fetchCourses]);

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"));
  };

  const handleSubmit = async () => {
    if (!accessToken) return;

    const emails = parseEmails(emailsText);
    if (emails.length === 0) {
      setError(t.bulkCreateUsersNoEmails || "Please enter at least one valid email address.");
      return;
    }

    if (passwordMode === "specified") {
      if (!password || password.length < 8) {
        setError(t.bulkCreateUsersPasswordTooShort || "Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError(t.bulkCreateUsersPasswordMismatch || "Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const payload: BulkCreateUsersPayload = {
        emails,
        autoVerify,
        passwordMode,
        ...(passwordMode === "specified" ? { password } : {}),
        ...(selectedCourseId ? { courseId: selectedCourseId } : {}),
      };

      const res = await bulkCreateUsers(payload, accessToken);
      setResult(res);

      if (res.created.length > 0) {
        setSuccess(
          (t.bulkCreateUsersSuccess || "{count} user(s) created successfully.").replace(
            "{count}",
            String(res.created.length)
          )
        );
        // Clear form on success
        setEmailsText("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailCount = parseEmails(emailsText).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-3xl px-4 py-12">
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
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t.bulkCreateUsersAccessDenied || "Access denied. Admin privileges required."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.bulkCreateUsersBackToAdmin || "Back to Admin"}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t.bulkCreateUsersTitle || "Bulk Create Users"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.bulkCreateUsersSubtitle || "Create multiple user accounts at once."}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
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

        {/* Form */}
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.bulkCreateUsersEmailsLabel || "Email Addresses"}
              <span className="ml-2 text-gray-400 font-normal">
                ({emailCount} {t.bulkCreateUsersEmailCount || "email(s)"})
              </span>
            </label>
            <textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder={t.bulkCreateUsersEmailsPlaceholder || "Enter one email per line\nuser1@example.com\nuser2@example.com"}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t.bulkCreateUsersEmailsHint || "Separate emails by new lines, commas, or semicolons."}
            </p>
          </div>

          {/* Auto Verify Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-700">
                {t.bulkCreateUsersAutoVerifyLabel || "Auto-verify Email"}
              </div>
              <div className="text-xs text-gray-500">
                {t.bulkCreateUsersAutoVerifyHint || "Skip email verification step for created accounts."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoVerify(!autoVerify)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoVerify ? "bg-green-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoVerify ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Password Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t.bulkCreateUsersPasswordModeLabel || "Password Setting"}
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="passwordMode"
                  value="random"
                  checked={passwordMode === "random"}
                  onChange={() => setPasswordMode("random")}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {t.bulkCreateUsersPasswordRandom || "Generate random passwords"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.bulkCreateUsersPasswordRandomHint || "Each user will receive a unique random password via email."}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="passwordMode"
                  value="specified"
                  checked={passwordMode === "specified"}
                  onChange={() => setPasswordMode("specified")}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {t.bulkCreateUsersPasswordSpecified || "Use specified password"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.bulkCreateUsersPasswordSpecifiedHint || "All users will have the same initial password."}
                  </div>
                </div>
              </label>
            </div>

            {/* Password Input (when specified) */}
            {passwordMode === "specified" && (
              <div className="mt-4 space-y-3 pl-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {t.bulkCreateUsersPasswordLabel || "Password"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.bulkCreateUsersPasswordPlaceholder || "Enter password (min 8 characters)"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {t.bulkCreateUsersConfirmPasswordLabel || "Confirm Password"}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.bulkCreateUsersConfirmPasswordPlaceholder || "Re-enter password"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.bulkCreateUsersCourseLabel || "Add to Course (Optional)"}
            </label>
            <select
              value={selectedCourseId ?? ""}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
            >
              <option value="">{t.bulkCreateUsersNoCourse || "-- Don't add to any course --"}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} {course.term ? `(${course.term})` : ""} - {course.code}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t.bulkCreateUsersCourseHint || "Users will be added as students to the selected course."}
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || emailCount === 0}
              className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-[#003865] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1e5d8f] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isSubmitting
                ? (t.bulkCreateUsersSubmitting || "Creating users...")
                : (t.bulkCreateUsersSubmit || "Create {count} User(s)").replace("{count}", String(emailCount))}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Created Users */}
            {result.created.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  {t.bulkCreateUsersCreatedTitle || "Successfully Created"} ({result.created.length})
                </h3>
                <div className="space-y-1 text-sm text-green-700">
                  {result.created.map((u, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-mono">{u.email}</span>
                      <span className="text-green-600">→ {u.username}</span>
                      {u.passwordSent && (
                        <span className="text-xs bg-green-200 text-green-800 px-1 rounded">
                          {t.bulkCreateUsersPasswordSent || "password sent"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Users */}
            {result.skipped.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  {t.bulkCreateUsersSkippedTitle || "Skipped"} ({result.skipped.length})
                </h3>
                <div className="space-y-1 text-sm text-yellow-700">
                  {result.skipped.map((u, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-mono">{u.email}</span>
                      <span className="text-yellow-600">
                        ({u.reason === "EMAIL_EXISTS"
                          ? (t.bulkCreateUsersReasonEmailExists || "email already exists")
                          : u.reason})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  {t.bulkCreateUsersErrorsTitle || "Errors"} ({result.errors.length})
                </h3>
                <div className="space-y-1 text-sm text-red-700">
                  {result.errors.map((u, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-mono">{u.email}</span>
                      <span className="text-red-600">- {u.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
