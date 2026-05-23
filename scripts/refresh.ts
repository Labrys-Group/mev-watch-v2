import "dotenv/config";
import { refreshDay } from "../src/lib/refresh";
import { getDataSource } from "../src/lib/data-source/factory";
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";

/** Returns yesterday's date (UTC) as an ISO string — the most recent complete day. */
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const date = process.argv[2] ?? yesterdayUtc();
  console.log(`Refreshing relay stats for ${date}...`);

  const result = await refreshDay(
    date,
    getDataSource(),
    new EthRpcBlockCountSource(),
  );

  if (result.status === "ok") {
    console.log(`OK — ${date} refreshed.`);
    process.exit(0);
  } else {
    console.error(`FAILED — ${date}: ${result.message}`);
    process.exit(1);
  }
}

main();
