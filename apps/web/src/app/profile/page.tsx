"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) {
      return;
    }

    if (user) {
      router.replace(`/users/${user.username}`);
    } else {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <div className="skeleton-shimmer relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gray-200/80" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 rounded bg-gray-200/80" />
              <div className="h-4 w-24 rounded bg-gray-200/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
