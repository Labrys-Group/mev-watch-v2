import { StatusBar } from "@/components/sections/status-bar";
import { SiteHeader } from "@/components/sections/site-header";
import { Reveal } from "@/components/reveal";
import { Hero } from "@/components/sections/hero";
import { Composition } from "@/components/sections/composition";
import { Leaderboard } from "@/components/sections/leaderboard";
import { BuilderLeaderboard } from "@/components/sections/builder-leaderboard";
import { WhatToDo } from "@/components/sections/what-to-do";
import { TrendChart } from "@/components/sections/trend-chart";
import { Faq } from "@/components/sections/faq";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  getLatestStats,
  getStatsSummary,
  getTrend,
  getLeaderboard,
  getBuilderLeaderboard,
  getLastRefresh,
} from "@/lib/queries";

// Re-rendered hourly; the refresh job updates the underlying data.
export const revalidate = 3600;

export default async function Home() {
  const [latest, summary, trend, leaderboard, builders, lastRefresh] = await Promise.all([
    getLatestStats(),
    getStatsSummary(),
    getTrend(),
    getLeaderboard(),
    getBuilderLeaderboard(),
    getLastRefresh(),
  ]);

  if (!latest || !summary) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-fg-muted">
          No data yet — run <code>pnpm seed-history</code>.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Status bar + nav stay pinned together as you scroll */}
      <div className="sticky top-0 z-50">
        <StatusBar
          latestDate={latest.date}
          censorshipPct={latest.censorshipPct}
          lastRefresh={lastRefresh?.ranAt ?? null}
        />
        <SiteHeader />
      </div>
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="space-y-4 py-5">
          <Hero summary={summary} />
          <Reveal>
            <Composition latest={latest} />
          </Reveal>
          <Reveal>
            <TrendChart trend={trend} summary={summary} />
          </Reveal>
          <Reveal>
            <Leaderboard rows={leaderboard} />
          </Reveal>
          <Reveal>
            <BuilderLeaderboard rows={builders} />
          </Reveal>
          <Reveal>
            <WhatToDo />
          </Reveal>
          <Reveal>
            <Faq />
          </Reveal>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
