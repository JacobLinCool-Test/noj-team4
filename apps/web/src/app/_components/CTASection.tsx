'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';

export function CTASection() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <section className="relative py-24 bg-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-100/50 via-blue-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          準備好開始了嗎？
        </h2>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          無論你是想要練習程式設計的學生，還是需要出題的教師，NOJ 都能滿足你的需求。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/problems"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#003865] to-[#1e5d8f] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                瀏覽題目
              </Link>
              <Link
                href="/courses"
                className="w-full sm:w-auto px-8 py-3.5 bg-white border-2 border-[#003865] text-[#003865] rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
              >
                查看課程
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#003865] to-[#1e5d8f] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                免費註冊
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-white border-2 border-[#003865] text-[#003865] rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
              >
                登入帳號
              </Link>
            </>
          )}
        </div>

        {/* Feature badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>完全免費</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>支援多種語言</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>AI 智能輔助</span>
          </div>
        </div>
      </div>
    </section>
  );
}
