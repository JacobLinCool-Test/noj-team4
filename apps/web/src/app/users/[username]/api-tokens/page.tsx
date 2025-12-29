"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
import ApiTokenManager from "@/components/api-tokens/ApiTokenManager";

export default function UserApiTokensPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const { user, loading: authLoading } = useAuth();

  // 檢查是否是自己的頁面
  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // 如果不是自己的頁面，重定向到自己的 API Token 頁面
    if (!isOwnProfile) {
      router.replace(`/users/${user.username}/api-tokens`);
    }
  }, [user, authLoading, isOwnProfile, router, username]);

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

  if (!user || !isOwnProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-gray-900">
      <ApiTokenManager
        showBackLink={true}
        backLinkHref={`/users/${username}`}
      />
    </div>
  );
}
