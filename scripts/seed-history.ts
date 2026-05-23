import "dotenv/config";
import { refreshDay } from "../src/lib/refresh";
import { getDataSource } from "../src/lib/data-source/factory";
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";

/** MEV-boost began at the Merge; relayscan has data from shortly after. */
const DEFAULT_START = "2022-09-15";

function* dateRange(start: string, end: string): Generator<string> {
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const start = process.argv[2] ?? DEFAULT_START;
  const end = process.argv[3] ?? yesterdayUtc();
  const source = getDataSource();
  const blockSource = new EthRpcBlockCountSource();

  let ok = 0;
  let failed = 0;

  for (const date of dateRange(start, end)) {
    const result = await refreshDay(date, source, blockSource);
    if (result.status === "ok") {
      ok += 1;
    } else {
      failed += 1;
      console.warn(`  skip ${date}: ${result.message}`);
    }
    // Be polite to the public API.
    await sleep(300);
  }

  console.log(`Seed complete — ${ok} days seeded, ${failed} skipped.`);
  process.exit(0);
}

main();
