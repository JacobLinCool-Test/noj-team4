'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import {
  getJoinLinkCourse,
  joinByLink,
  type JoinLinkCourse,
} from '@/lib/api/course-join-link';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default function JoinByLinkPage({ params }: PageProps) {
  const router = useRouter();
  const { accessToken, user, loading: authLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [course, setCourse] = useState<JoinLinkCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  const fetchCourse = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJoinLinkCourse(token);
      setCourse(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '無效的加入連結';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCourse();
    }
  }, [token, fetchCourse]);

  const handleJoin = async () => {
    if (!token || !accessToken) return;
    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinByLink(token, accessToken);
      router.push(`/courses/${result.slug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加入失敗';
      setJoinError(message);
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="h-20 w-full rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-800">連結無效</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Link
            href="/courses"
            className="mt-4 inline-flex items-center rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
          >
            返回課程列表
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[#003865]">加入課程</h1>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-gray-500">課程名稱</p>
            <p className="text-lg font-medium text-gray-900">{course.name}</p>
          </div>
          {course.term && (
            <div>
              <p className="text-sm text-gray-500">學期</p>
              <p className="text-gray-800">{course.term}</p>
            </div>
          )}
          {course.teacher && (
            <div>
              <p className="text-sm text-gray-500">教師</p>
              <p className="text-gray-800">{course.teacher.nickname}</p>
            </div>
          )}
          {course.description && (
            <div>
              <p className="text-sm text-gray-500">課程說明</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {course.description}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 border-t pt-4">
          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">請先登入以加入此課程</p>
              <Link
                href={`/login?next=/courses/join/${token}`}
                className="inline-flex w-full items-center justify-center rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
              >
                登入
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                以 <span className="font-medium">{user.username}</span> 的身份加入此課程
              </p>
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="inline-flex w-full items-center justify-center rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
              >
                {joining ? '加入中...' : '加入課程'}
              </button>
              {joinError && (
                <p className="text-sm text-red-600">{joinError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
