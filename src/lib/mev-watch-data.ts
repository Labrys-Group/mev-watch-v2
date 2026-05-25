import { z } from "zod";
import {
  computeBuilderBreakdown,
  computeDailyStats,
  computeRelayBreakdown,
} from "./metrics";

const RelayPayloadCountSchema = z.object({
  relayId: z.string(),
  numPayloads: z.number().nonnegative(),
});

const BuilderBlockCountSchema = z.object({
  builderId: z.string(),
  numBlocks: z.number().nonnegative(),
});

export const MevWatchDaySchema = z.object({
  date: z.string(),
  relays: z.array(RelayPayloadCountSchema),
  builders: z.array(BuilderBlockCountSchema),
  totalChainBlocks: z.number().int().nonnegative(),
});

export const MevWatchSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  sourceStartDate: z.string(),
  sourceEndDate: z.string().nullable(),
  days: z.array(MevWatchDaySchema),
});

export type MevWatchDay = z.infer<typeof MevWatchDaySchema>;
export type MevWatchSnapshot = z.infer<typeof MevWatchSnapshotSchema>;

export interface TrendPoint {
  date: string;
  censorshipPct: number;
  nonBoostPct?: number;
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

export interface BuilderRow {
  builderId: string;
  blocks: number;
  sharePct: number;
}

function sortedDays(snapshot: MevWatchSnapshot): MevWatchDay[] {
  return [...snapshot.days].sort((a, b) => a.date.localeCompare(b.date));
}

function latestDay(snapshot: MevWatchSnapshot): MevWatchDay | null {
  return sortedDays(snapshot).at(-1) ?? null;
}

export function deriveTrend(snapshot: MevWatchSnapshot): TrendPoint[] {
  return sortedDays(snapshot).map((day) => {
    const stats = computeDailyStats(
      day.relays,
      day.builders,
      day.totalChainBlocks,
      day.date,
    );
    return {
      date: day.date,
      censorshipPct: stats.censorshipPct,
      nonBoostPct: stats.nonBoostPct,
    };
  });
}

export function deriveLatestStats(
  snapshot: MevWatchSnapshot,
): LatestStats | null {
  const day = latestDay(snapshot);
  if (!day) return null;
  const stats = computeDailyStats(
    day.relays,
    day.builders,
    day.totalChainBlocks,
    day.date,
  );
  return { date: day.date, ...stats };
}

export function deriveRelayLeaderboard(
  snapshot: MevWatchSnapshot,
): LeaderboardRow[] {
  const day = latestDay(snapshot);
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
}

export function deriveBuilderLeaderboard(
  snapshot: MevWatchSnapshot,
): BuilderRow[] {
  const day = latestDay(snapshot);
  if (!day) return [];
  return computeBuilderBreakdown(day.builders)
    .map(({ builderId, blocks, sharePct }) => ({ builderId, blocks, sharePct }))
    .sort((a, b) => b.sharePct - a.sharePct);
}
