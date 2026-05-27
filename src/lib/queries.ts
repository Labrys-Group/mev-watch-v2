import { cache } from "react";
import {
  deriveBuilderLeaderboard,
  deriveLatestStats,
  deriveRelayLeaderboard,
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
  readMetadata,
  readSnapshotFromDatabase,
} from "@/lib/mev-watch-sqlite";

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

const getSnapshot = cache(async () => {
  const db = createReadOnlyMevWatchDatabase(await resolveReadableArtifactPath());
  try {
    return readSnapshotFromDatabase(db);
  } finally {
    db.close();
  }
});

export const getTrend = cache(async (): Promise<TrendPoint[]> => {
  return deriveTrend(await getSnapshot());
});

export const getLatestStats = cache(async (): Promise<LatestStats | null> => {
  return deriveLatestStats(await getSnapshot());
});

export async function getStatsSummary(): Promise<StatsSummary | null> {
  return summarise(await getTrend());
}

export const getLeaderboard = cache(async (): Promise<LeaderboardRow[]> => {
  return deriveRelayLeaderboard(await getSnapshot());
});

export const getBuilderLeaderboard = cache(async (): Promise<BuilderRow[]> => {
  return deriveBuilderLeaderboard(await getSnapshot());
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
        : process.env.MEV_WATCH_SQLITE_PATH ?? "src/data/mev-watch.sqlite",
      message: `Data through ${sourceEndDate}`,
    };
  } finally {
    db.close();
  }
});

export async function getRecentRefreshes(): Promise<RefreshInfo[]> {
  return [];
}
