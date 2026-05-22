import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyStats, relayDailyStats, refreshLog, builderDailyStats } from "@/lib/db/schema";
import { classifyRelay } from "@/config/relays";

export interface TrendPoint {
  date: string;
  censorshipPct: number;
}

export interface StatsSummary {
  current: number;
  peak: number;
  peakDate: string;
  trough: number;
}

export interface LatestStats {
  date: string;
  censorshipPct: number;
  neutralPct: number;
  nonBoostPct: number;
  totalBlocks: number;
}

export interface LeaderboardRow {
  relayId: string;
  name: string;
  posture: string;
  blocks: number;
  sharePct: number;
}

export interface RefreshInfo {
  ranAt: Date;
  status: string;
  source: string;
  message: string | null;
}

/** Pure derivation — peak/current/trough from a trend series. Exported for testing. */
export function summarise(trend: TrendPoint[]): StatsSummary | null {
  if (trend.length === 0) return null;
  let peak = trend[0];
  let trough = trend[0];
  for (const p of trend) {
    if (p.censorshipPct > peak.censorshipPct) peak = p;
    if (p.censorshipPct < trough.censorshipPct) trough = p;
  }
  return {
    current: trend[trend.length - 1].censorshipPct,
    peak: peak.censorshipPct,
    peakDate: peak.date,
    trough: trough.censorshipPct,
  };
}

/**
 * Runs a database query, returning `fallback` instead of throwing when the
 * database is unreachable or errors. Pages declare `revalidate` (ISR), so
 * Next.js prerenders them at build time — a transient Turso outage or an env
 * misconfiguration must not fail the whole build. Callers render their own
 * "data unavailable" state from the fallback instead. Exported for testing.
 */
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

/** Full censorship trend, oldest first — drives the trend chart. */
export async function getTrend(): Promise<TrendPoint[]> {
  return safeQuery(
    "getTrend",
    async () =>
      db
        .select({ date: dailyStats.date, censorshipPct: dailyStats.censorshipPct })
        .from(dailyStats)
        .orderBy(dailyStats.date),
    [],
  );
}

/** The most recent day's composition. */
export async function getLatestStats(): Promise<LatestStats | null> {
  return safeQuery(
    "getLatestStats",
    async () => {
      const [row] = await db
        .select()
        .from(dailyStats)
        .orderBy(desc(dailyStats.date))
        .limit(1);
      if (!row) return null;
      return {
        date: row.date,
        censorshipPct: row.censorshipPct,
        neutralPct: row.neutralPct,
        nonBoostPct: row.nonBoostPct,
        totalBlocks: row.totalBlocks,
      };
    },
    null,
  );
}

/**
 * Peak / current / trough summary across all history. Inherits `getTrend`'s
 * fail-soft behaviour — an empty trend summarises to `null`.
 */
export async function getStatsSummary(): Promise<StatsSummary | null> {
  return summarise(await getTrend());
}

/** The most recent day's per-relay leaderboard, sorted by share descending. */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  return safeQuery(
    "getLeaderboard",
    async () => {
      const [latest] = await db
        .select({ date: dailyStats.date })
        .from(dailyStats)
        .orderBy(desc(dailyStats.date))
        .limit(1);
      if (!latest) return [];

      const rows = await db
        .select()
        .from(relayDailyStats)
        .where(eq(relayDailyStats.date, latest.date));

      return rows
        .map((r) => ({
          relayId: r.relayKey,
          name: classifyRelay(r.relayKey).name,
          posture: classifyRelay(r.relayKey).posture,
          blocks: r.blocks,
          sharePct: r.sharePct,
        }))
        .sort((a, b) => b.sharePct - a.sharePct);
    },
    [],
  );
}

export interface BuilderRow {
  builderId: string;
  blocks: number;
  sharePct: number;
}

/** The most recent day's per-builder leaderboard, sorted by share descending. */
export async function getBuilderLeaderboard(): Promise<BuilderRow[]> {
  return safeQuery(
    "getBuilderLeaderboard",
    async () => {
      const [latest] = await db
        .select({ date: builderDailyStats.date })
        .from(builderDailyStats)
        .orderBy(desc(builderDailyStats.date))
        .limit(1);
      if (!latest) return [];

      const rows = await db
        .select()
        .from(builderDailyStats)
        .where(eq(builderDailyStats.date, latest.date));

      return rows
        .map((r) => ({
          builderId: r.builderKey,
          blocks: r.blocks,
          sharePct: r.sharePct,
        }))
        .sort((a, b) => b.sharePct - a.sharePct);
    },
    [],
  );
}

/** The latest refresh-log entry — powers the "last updated" indicator. */
export async function getLastRefresh(): Promise<RefreshInfo | null> {
  return safeQuery(
    "getLastRefresh",
    async () => {
      const [row] = await db
        .select()
        .from(refreshLog)
        .orderBy(desc(refreshLog.ranAt))
        .limit(1);
      if (!row) return null;
      return {
        ranAt: row.ranAt,
        status: row.status,
        source: row.source,
        message: row.message ?? null,
      };
    },
    null,
  );
}

/** The most recent N refresh-log entries, newest first — powers the status page. */
export async function getRecentRefreshes(limit = 20): Promise<RefreshInfo[]> {
  return safeQuery(
    "getRecentRefreshes",
    async () => {
      const rows = await db
        .select()
        .from(refreshLog)
        .orderBy(desc(refreshLog.ranAt))
        .limit(limit);
      return rows.map((r) => ({
        ranAt: r.ranAt,
        status: r.status,
        source: r.source,
        message: r.message ?? null,
      }));
    },
    [],
  );
}
