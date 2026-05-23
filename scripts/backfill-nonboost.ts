import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { dailyStats, builderDailyStats } from "../src/lib/db/schema";
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";
import { nonBoostShare } from "../src/lib/metrics";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Populate `nonBoostPct` / `totalChainBlocks` for every existing daily_stats
 * row. MEV-boost block counts come from the already-persisted
 * builder_daily_stats — no relayscan re-fetch needed. Idempotent: safe to
 * re-run, and doubles as a repair tool for any day a live refresh left at 0.
 */
async function main() {
  const source = new EthRpcBlockCountSource();
  const rows = await db
    .select({ date: dailyStats.date })
    .from(dailyStats)
    .orderBy(dailyStats.date);

  console.log(`Backfilling non-boost share for ${rows.length} days...`);

  let updated = 0;
  let failed = 0;

  for (const { date } of rows) {
    try {
      const totalChainBlocks = await source.totalBlocks(date);
      const builders = await db
        .select({ blocks: builderDailyStats.blocks })
        .from(builderDailyStats)
        .where(eq(builderDailyStats.date, date));
      const mevBoostBlocks = builders.reduce((sum, b) => sum + b.blocks, 0);
      const nonBoostPct = nonBoostShare(totalChainBlocks, mevBoostBlocks);

      await db
        .update(dailyStats)
        .set({ totalChainBlocks, nonBoostPct })
        .where(eq(dailyStats.date, date));

      updated += 1;
      console.log(
        `  ${date}: ${nonBoostPct.toFixed(2)}% non-boost (${totalChainBlocks} blocks)`,
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  skip ${date}: ${message}`);
    }
    // Be polite to the public RPC.
    await sleep(200);
  }

  console.log(`Backfill complete — ${updated} updated, ${failed} skipped.`);
  process.exit(0);
}

main();
