import "dotenv/config";
import { db } from "../src/lib/db";
import { dailyStats, refreshLog } from "../src/lib/db/schema";
import { asc, desc, eq, and } from "drizzle-orm";
import { refreshDay } from "../src/lib/refresh";
import { getDataSource } from "../src/lib/data-source/factory";
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";

const MAX_CONCURRENCY = 3;
const EXPECTED_SOURCE_NAME = "dune.com+relayscan.io";

function* dateRange(start: string, end: string): Generator<string> {
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "composite") {
    console.error(
      `DATA_SOURCE_MODE must be 'composite' to run this backfill (got: ${process.env.DATA_SOURCE_MODE ?? "<unset>"}).`,
    );
    process.exit(1);
  }

  const minRow = await db.select({ date: dailyStats.date }).from(dailyStats).orderBy(asc(dailyStats.date)).limit(1);
  const maxRow = await db.select({ date: dailyStats.date }).from(dailyStats).orderBy(desc(dailyStats.date)).limit(1);
  if (minRow.length === 0 || maxRow.length === 0) {
    console.error("daily_stats is empty — run pnpm seed-history first.");
    process.exit(1);
  }
  const start = process.argv[2] ?? minRow[0].date;
  const end = process.argv[3] ?? maxRow[0].date;
  console.log(`Backfilling ${start} → ${end} from Dune (concurrency=${MAX_CONCURRENCY})…`);

  // Pre-fetch the set of already-backfilled dates from refresh_log.
  const doneRows = await db
    .select({ message: refreshLog.message })
    .from(refreshLog)
    .where(and(eq(refreshLog.status, "ok"), eq(refreshLog.source, EXPECTED_SOURCE_NAME)));
  const done = new Set<string>();
  for (const r of doneRows) {
    const match = r.message?.match(/Refreshed (\d{4}-\d{2}-\d{2}):/);
    if (match) done.add(match[1]);
  }
  console.log(`Skipping ${done.size} dates already backfilled.`);

  const source = getDataSource();
  const blockSource = new EthRpcBlockCountSource();

  const dates = [...dateRange(start, end)].filter((d) => !done.has(d));

  if (dates.length === 0) {
    console.log("Nothing to do — all dates in range already backfilled.");
    process.exit(0);
  }

  let ok = 0;
  let failed = 0;
  let inFlight = 0;
  let cursor = 0;

  await new Promise<void>((resolve) => {
    const launch = () => {
      while (inFlight < MAX_CONCURRENCY && cursor < dates.length) {
        const date = dates[cursor++];
        inFlight++;
        refreshDay(date, source, blockSource)
          .then((result) => {
            if (result.status === "ok") {
              ok++;
              if (ok % 25 === 0) {
                console.log(`  ${ok}/${dates.length} ok (failed=${failed})`);
              }
            } else {
              failed++;
              console.warn(`  FAIL ${date}: ${result.message}`);
            }
          })
          .catch((err) => {
            failed++;
            console.warn(`  THROW ${date}: ${err instanceof Error ? err.message : err}`);
          })
          .finally(() => {
            inFlight--;
            if (cursor >= dates.length && inFlight === 0) resolve();
            else launch();
          });
      }
    };
    launch();
  });

  console.log(`Backfill complete — ${ok} days written, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
