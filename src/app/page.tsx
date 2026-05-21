import { StatusBar } from "@/components/sections/status-bar";
import { SiteHeader } from "@/components/sections/site-header";
import { Hero } from "@/components/sections/hero";
import { Composition } from "@/components/sections/composition";
import { Leaderboard } from "@/components/sections/leaderboard";
import { WhatToDo } from "@/components/sections/what-to-do";
import { TrendChart } from "@/components/sections/trend-chart";
import { CompositionGrid } from "@/components/sections/composition-grid";
import { Faq } from "@/components/sections/faq";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  getLatestStats,
  getStatsSummary,
  getTrend,
  getLeaderboard,
  getLastRefresh,
} from "@/lib/queries";

// Re-rendered hourly; the refresh job updates the underlying data.
export const revalidate = 3600;

export default async function Home() {
  const [latest, summary, trend, leaderboard, lastRefresh] = await Promise.all([
    getLatestStats(),
    getStatsSummary(),
    getTrend(),
    getLeaderboard(),
    getLastRefresh(),
  ]);

  if (!latest || !summary) {
    return (
      <main className="terminal-grid flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-fg-muted">
          No data yet — run <code>pnpm seed-history</code>.
        </p>
      </main>
    );
  }

  return (
    <div className="terminal-grid min-h-screen">
      <StatusBar
        latestDate={latest.date}
        censorshipPct={latest.censorshipPct}
        lastRefresh={lastRefresh?.ranAt ?? null}
      />
      <div className="mx-auto max-w-[1280px] px-6">
        <SiteHeader />
        <Hero summary={summary} />
        <Composition latest={latest} />
        <Leaderboard rows={leaderboard} />
        <WhatToDo />
        <TrendChart trend={trend} summary={summary} />
        <CompositionGrid latest={latest} />
        <Faq />
      </div>
      <SiteFooter />
    </div>
  );
}
