"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
import ApiTokenManager from "@/components/api-tokens/ApiTokenManager";

export default function ApiTokensPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
        <div className="w-full max-w-4xl">
          <div className="skeleton-shimmer relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="h-6 w-48 rounded bg-gray-200/80" />
              <div className="h-20 w-full rounded bg-gray-200/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-gray-900">
      <ApiTokenManager />
    </div>
  );
}
