import "dotenv/config";
import { db } from "../src/lib/db";
import {
  dailyStats,
  relayDailyStats,
  builderDailyStats,
} from "../src/lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const rows = await db.select().from(dailyStats).orderBy(desc(dailyStats.date));
  const relayRows = await db.select().from(relayDailyStats);
  const builderRows = await db.select().from(builderDailyStats);

  console.log(`daily_stats rows: ${rows.length}`);
  console.log(`relay_daily_stats rows: ${relayRows.length}`);
  console.log(`builder_daily_stats rows: ${builderRows.length}`);

  if (rows.length > 0) {
    const latest = rows[0];
    const earliest = rows[rows.length - 1];
    console.log(`date range: ${earliest.date} -> ${latest.date}`);
    console.log(
      `latest: ${latest.date} — censorship ${latest.censorshipPct.toFixed(1)}% ` +
        `· neutral ${latest.neutralPct.toFixed(1)}% · non-boost ${latest.nonBoostPct.toFixed(1)}%`,
    );
  }
  process.exit(0);
}

main();
