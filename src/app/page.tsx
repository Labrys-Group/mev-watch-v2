import { Suspense } from "react";

import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { WhatToDo } from "@/components/sections/what-to-do";
import { Faq } from "@/components/sections/faq";

import { StatusBarData } from "@/components/sections/status-bar.data";
import { HeroData } from "@/components/sections/hero.data";
import { CompositionData } from "@/components/sections/composition.data";
import { TrendChartData } from "@/components/sections/trend-chart.data";
import { LeaderboardData } from "@/components/sections/leaderboard.data";
import { BuilderLeaderboardData } from "@/components/sections/builder-leaderboard.data";
import { getFaqJsonLd } from "@/config/seo";

import { StatusBarSkeleton } from "@/components/skeletons/status-bar.skeleton";
import { HeroSkeleton } from "@/components/skeletons/hero.skeleton";
import { CompositionSkeleton } from "@/components/skeletons/composition.skeleton";
import { TrendChartSkeleton } from "@/components/skeletons/trend-chart.skeleton";
import { LeaderboardSkeleton } from "@/components/skeletons/leaderboard.skeleton";
import { BuilderLeaderboardSkeleton } from "@/components/skeletons/builder-leaderboard.skeleton";

// Re-rendered hourly; the refresh job updates the underlying data.
export const revalidate = 3600;

const faqJsonLd = getFaqJsonLd();

export default function Home() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Status bar + nav stay pinned together as you scroll */}
      <div className="sticky top-0 z-50">
        <Suspense fallback={<StatusBarSkeleton />}>
          <StatusBarData />
        </Suspense>
        <SiteHeader />
      </div>
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="space-y-4 py-5">
          <Suspense fallback={<HeroSkeleton />}>
            <HeroData />
          </Suspense>
          <Suspense fallback={<CompositionSkeleton />}>
            <CompositionData />
          </Suspense>
          <Suspense fallback={<TrendChartSkeleton />}>
            <TrendChartData />
          </Suspense>
          <Suspense fallback={<LeaderboardSkeleton />}>
            <LeaderboardData />
          </Suspense>
          <Suspense fallback={<BuilderLeaderboardSkeleton />}>
            <BuilderLeaderboardData />
          </Suspense>
          <WhatToDo />
          <Faq />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
