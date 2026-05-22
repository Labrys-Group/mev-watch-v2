import { db } from "../db";
import { dailyStats, relayDailyStats, builderDailyStats } from "../db/schema";
import { computeDailyStats, computeRelayBreakdown, computeBuilderBreakdown } from "../metrics";
import type { DaySnapshot } from "../data-source/types";

/**
 * Compute metrics for one day of relay stats and upsert them into the snapshot
 * tables. Idempotent — re-running for the same date overwrites that day's rows.
 */
export async function persistDailySnapshot(day: DaySnapshot): Promise<void> {
  const stats = computeDailyStats(
    day.relays,
    day.builders,
    day.totalChainBlocks,
    day.date,
  );
  const breakdown = computeRelayBreakdown(day.relays, day.date);

  await db
    .insert(dailyStats)
    .values({
      date: day.date,
      censorshipPct: stats.censorshipPct,
      neutralPct: stats.neutralPct,
      nonBoostPct: stats.nonBoostPct,
      totalBlocks: stats.totalBlocks,
      totalChainBlocks: day.totalChainBlocks,
    })
    .onConflictDoUpdate({
      target: dailyStats.date,
      set: {
        censorshipPct: stats.censorshipPct,
        neutralPct: stats.neutralPct,
        nonBoostPct: stats.nonBoostPct,
        totalBlocks: stats.totalBlocks,
        totalChainBlocks: day.totalChainBlocks,
      },
    });

  for (const relay of breakdown) {
    await db
      .insert(relayDailyStats)
      .values({
        relayKey: relay.relayId,
        date: day.date,
        blocks: relay.blocks,
        sharePct: relay.sharePct,
        censorshipRate: relay.censorshipRate,
      })
      .onConflictDoUpdate({
        target: [relayDailyStats.relayKey, relayDailyStats.date],
        set: {
          blocks: relay.blocks,
          sharePct: relay.sharePct,
          censorshipRate: relay.censorshipRate,
        },
      });
  }

  for (const builder of computeBuilderBreakdown(day.builders)) {
    await db
      .insert(builderDailyStats)
      .values({
        builderKey: builder.builderId,
        date: day.date,
        blocks: builder.blocks,
        sharePct: builder.sharePct,
      })
      .onConflictDoUpdate({
        target: [builderDailyStats.builderKey, builderDailyStats.date],
        set: {
          blocks: builder.blocks,
          sharePct: builder.sharePct,
        },
      });
  }
}
