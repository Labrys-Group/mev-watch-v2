import { pathToFileURL } from "node:url";
import {
  buildDateRange,
  nextMissingStartDate,
  readSnapshot,
  updateDataFile,
  yesterdayUtc,
} from "../src/lib/mev-watch-generator";

export function readUpdateDataConcurrency(): number {
  const value = Number(process.env.UPDATE_DATA_CONCURRENCY ?? 8);
  if (!Number.isFinite(value) || value < 1) return 8;
  return Math.floor(value);
}

export async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const concurrency = readUpdateDataConcurrency();
  if (dryRun) {
    const snapshot = await readSnapshot();
    const start = nextMissingStartDate(snapshot);
    const end = yesterdayUtc();
    const dates = buildDateRange(start, end);
    if (dates.length === 0) {
      console.log("MEV Watch data is already current.");
      return;
    }
    console.log(`would fetch ${dates.length} day(s): ${dates[0]}..${dates.at(-1)}`);
    return;
  }

  const result = await updateDataFile({
    dryRun,
    concurrency,
    writeEvery: 25,
    onProgress: ({ date, index, total }) => {
      console.log(`[${index}/${total}] fetched ${date}`);
    },
  });

  if (result.fetchedDates.length === 0) {
    console.log("MEV Watch data is already current.");
    return;
  }

  const first = result.fetchedDates[0];
  const last = result.fetchedDates.at(-1);
  console.log(`updated ${result.fetchedDates.length} day(s): ${first}..${last}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
