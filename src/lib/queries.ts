import { cache } from "react";
import {
  deriveBuilderLeaderboard,
  deriveLatestStats,
  deriveRelayLeaderboard,
  deriveTrend,
  MEV_WATCH_SNAPSHOT,
  type BuilderRow,
  type LatestStats,
  type LeaderboardRow,
  type TrendPoint,
} from "@/lib/mev-watch-data";

export type { BuilderRow, LatestStats, LeaderboardRow, TrendPoint };

export interface StatsSummary {
  current: number;
  peak: number;
  peakDate: string;
  trough: number;
}

export interface RefreshInfo {
  ranAt: Date;
  status: string;
  source: string;
  message: string | null;
}

export function summarise(trend: TrendPoint[]): StatsSummary | null {
  if (trend.length === 0) return null;
  let peak = trend[0];
  let trough = trend[0];
  for (const point of trend) {
    if (point.censorshipPct > peak.censorshipPct) peak = point;
    if (point.censorshipPct < trough.censorshipPct) trough = point;
  }
  return {
    current: trend[trend.length - 1].censorshipPct,
    peak: peak.censorshipPct,
    peakDate: peak.date,
    trough: trough.censorshipPct,
  };
}

export async function safeQuery<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[queries] ${label} failed; serving fallback:`, error);
    return fallback;
  }
}

export const getTrend = cache(async (): Promise<TrendPoint[]> => {
  return deriveTrend(MEV_WATCH_SNAPSHOT);
});

export const getLatestStats = cache(async (): Promise<LatestStats | null> => {
  return deriveLatestStats(MEV_WATCH_SNAPSHOT);
});

export async function getStatsSummary(): Promise<StatsSummary | null> {
  return summarise(await getTrend());
}

export const getLeaderboard = cache(async (): Promise<LeaderboardRow[]> => {
  return deriveRelayLeaderboard(MEV_WATCH_SNAPSHOT);
});

export const getBuilderLeaderboard = cache(async (): Promise<BuilderRow[]> => {
  return deriveBuilderLeaderboard(MEV_WATCH_SNAPSHOT);
});

export const getLastRefresh = cache(async (): Promise<RefreshInfo | null> => {
  if (!MEV_WATCH_SNAPSHOT.sourceEndDate) return null;
  return {
    ranAt: new Date(MEV_WATCH_SNAPSHOT.generatedAt),
    status: "ok",
    source: "src/data/mev-watch.json",
    message: `Data through ${MEV_WATCH_SNAPSHOT.sourceEndDate}`,
  };
});

export async function getRecentRefreshes(): Promise<RefreshInfo[]> {
  return [];
}
