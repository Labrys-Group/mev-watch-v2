import "dotenv/config";
import { db } from "../src/lib/db";
import { dailyStats } from "../src/lib/db/schema";

async function main() {
  const rows = await db.select().from(dailyStats);
  console.log("daily_stats rows:", rows.length);
  if (rows[0]) {
    console.log(rows[0]);
  }
  process.exit(0);
}

main();
