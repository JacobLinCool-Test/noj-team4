'use client';

import { HeroSection, FeatureShowcase, StatsSection, CTASection } from './_components';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <HeroSection />
      <FeatureShowcase />
      <StatsSection />
      <CTASection />
    </main>
  );
}
