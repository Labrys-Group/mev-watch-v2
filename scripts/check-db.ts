import "dotenv/config";
import { db } from "../src/lib/db";
import { refreshLog } from "../src/lib/db/schema";

async function main() {
  const [inserted] = await db
    .insert(refreshLog)
    .values({ status: "ok", source: "check-db", message: "connection check" })
    .returning();

  console.log("Inserted refresh_log row id:", inserted.id);

  const rows = await db.select().from(refreshLog);
  console.log("refresh_log row count:", rows.length);

  console.log("DATABASE CONNECTION OK");
  process.exit(0);
}

main().catch((error) => {
  console.error("DATABASE CONNECTION FAILED");
  console.error(error);
  process.exit(1);
});
