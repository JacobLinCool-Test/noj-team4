'use client';

import { useEffect, useRef, useState } from 'react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  gradient: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI 題目創建',
    description: '透過自然語言對話描述題目概念，AI 自動生成完整的程式設計題目、範例測資與標準答案。',
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-indigo-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'AI 程式助教',
    description: '遇到解題困難？AI 助教隨時提供解題提示、觀念講解，幫助你突破學習瓶頸。',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '即時判題系統',
    description: '安全隔離的 Docker 沙盒環境，支援多種程式語言，毫秒級回饋你的程式執行結果。',
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-orange-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: '課程管理系統',
    description: '教師可輕鬆建立課程、發布作業、追蹤學生學習進度，打造完整的程式教學環境。',
    color: 'text-green-600',
    gradient: 'from-green-500 to-teal-600',
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementTop = rect.top;
      const elementHeight = rect.height;

      // Calculate progress from 0 to 1 as element scrolls through viewport
      const progress = Math.max(0, Math.min(1,
        (windowHeight - elementTop) / (windowHeight + elementHeight)
      ));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isEven = index % 2 === 0;

  return (
    <div
      ref={cardRef}
      className={`relative py-16 md:py-24 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transform: isVisible
          ? `translateX(0) translateY(0)`
          : `translateX(${isEven ? '-50px' : '50px'}) translateY(30px)`,
      }}
    >
      <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
        isEven ? '' : 'md:flex-row-reverse'
      }`}>
        {/* Icon / Visual */}
        <div className="flex-shrink-0">
          <div
            className={`relative w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br ${feature.gradient} p-1 shadow-xl`}
            style={{
              transform: `scale(${0.9 + scrollProgress * 0.1}) rotate(${(scrollProgress - 0.5) * 5}deg)`,
            }}
          >
            <div className="w-full h-full rounded-[calc(1.5rem-4px)] bg-white flex items-center justify-center">
              <div className={`${feature.color}`}>
                {feature.icon}
              </div>
            </div>

            {/* Decorative elements */}
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/80 shadow-lg"
              style={{ transform: `translateY(${scrollProgress * 10}px)` }}
            />
            <div
              className="absolute -bottom-3 -left-3 w-4 h-4 rounded-full bg-gradient-to-br from-white/60 to-white/20"
              style={{ transform: `translateY(${-scrollProgress * 8}px)` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 text-center ${isEven ? 'md:text-left' : 'md:text-right'}`}>
          <h3 className={`text-2xl md:text-3xl font-bold text-gray-900 mb-4`}>
            {feature.title}
          </h3>
          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto md:mx-0">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Parallax background element */}
      <div
        className={`absolute ${isEven ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 pointer-events-none`}
        style={{
          background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
          transform: `translateY(${(scrollProgress - 0.5) * 100}px)`,
        }}
      />
    </div>
  );
}

export function FeatureShowcase() {
  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white py-16 md:py-24 overflow-hidden">
      {/* Section header */}
      <div className="text-center mb-16 md:mb-24 px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          為程式教學而生的平台
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          結合 AI 智能技術與現代化判題系統，提供完整的程式設計教學與練習環境
        </p>
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-6">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} index={index} />
        ))}
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#1e5d8f]/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-64 h-64 bg-gradient-to-r from-blue-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}
