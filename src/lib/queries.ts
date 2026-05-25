import { cache } from "react";
import {
  deriveTrend,
  type BuilderRow,
  type LatestStats,
  type LeaderboardRow,
  type TrendPoint,
} from "@/lib/mev-watch-data";
import {
  resolveReadableArtifactPath,
  shouldUseBlobArtifact,
} from "@/lib/mev-watch-blob";
import {
  createReadOnlyMevWatchDatabase,
  readLatestDayFromDatabase,
  readMetadata,
  readSnapshotFromDatabase,
} from "@/lib/mev-watch-sqlite";
import {
  computeBuilderBreakdown,
  computeDailyStats,
  computeRelayBreakdown,
} from "@/lib/metrics";

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
  const db = createReadOnlyMevWatchDatabase(await resolveReadableArtifactPath());
  try {
    return deriveTrend(readSnapshotFromDatabase(db));
  } finally {
    db.close();
  }
});

export const getLatestStats = cache(async (): Promise<LatestStats | null> => {
  const db = createReadOnlyMevWatchDatabase(await resolveReadableArtifactPath());
  try {
    const day = readLatestDayFromDatabase(db);
    if (!day) return null;
    const stats = computeDailyStats(
      day.relays,
      day.builders,
      day.totalChainBlocks,
      day.date,
    );
    return { date: day.date, ...stats };
  } finally {
    db.close();
  }
});

export async function getStatsSummary(): Promise<StatsSummary | null> {
  return summarise(await getTrend());
}

export const getLeaderboard = cache(async (): Promise<LeaderboardRow[]> => {
  const db = createReadOnlyMevWatchDatabase(await resolveReadableArtifactPath());
  try {
    const day = readLatestDayFromDatabase(db);
    if (!day) return [];
    return computeRelayBreakdown(day.relays, day.date)
      .map(({ relayId, name, posture, blocks, sharePct }) => ({
        relayId,
        name,
        posture,
        blocks,
        sharePct,
      }))
      .sort((a, b) => b.sharePct - a.sharePct);
  } finally {
    db.close();
  }
});

export const getBuilderLeaderboard = cache(async (): Promise<BuilderRow[]> => {
  const db = createReadOnlyMevWatchDatabase(await resolveReadableArtifactPath());
  try {
    const day = readLatestDayFromDatabase(db);
    if (!day) return [];
    return computeBuilderBreakdown(day.builders)
      .map(({ builderId, blocks, sharePct }) => ({
        builderId,
        blocks,
        sharePct,
      }))
      .sort((a, b) => b.sharePct - a.sharePct);
  } finally {
    db.close();
  }
});

export const getLastRefresh = cache(async (): Promise<RefreshInfo | null> => {
  const db = createReadOnlyMevWatchDatabase(await resolveReadableArtifactPath());
  try {
    const metadata = readMetadata(db);
    const sourceEndDate = metadata.get("sourceEndDate");
    if (!sourceEndDate) return null;
    return {
      ranAt: new Date(metadata.get("generatedAt") ?? 0),
      status: "ok",
      source: shouldUseBlobArtifact()
        ? "Vercel Blob data/mev-watch.sqlite"
        : "src/data/mev-watch.sqlite",
      message: `Data through ${sourceEndDate}`,
    };
  } finally {
    db.close();
  }
});

export async function getRecentRefreshes(): Promise<RefreshInfo[]> {
  return [];
}
