import {
  buildDateRange,
  nextMissingStartDate,
  readSnapshot,
  updateDataFile,
  yesterdayUtc,
} from "../src/lib/mev-watch-generator";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
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

  const result = await updateDataFile({ dryRun });

  if (result.fetchedDates.length === 0) {
    console.log("MEV Watch data is already current.");
    return;
  }

  const first = result.fetchedDates[0];
  const last = result.fetchedDates.at(-1);
  console.log(`updated ${result.fetchedDates.length} day(s): ${first}..${last}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
