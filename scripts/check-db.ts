import "dotenv/config";
import { db } from "../src/lib/db";
import { refreshLog } from "../src/lib/db/schema";

async function main() {
  const [inserted] = await db
    .insert(refreshLog)
    .values({ status: "ok", source: "check-db", message: "connection check" })
    .returning();

  console.log("Inserted and read back refresh_log row id:", inserted.id);
  console.log("DATABASE CONNECTION OK");
  process.exit(0);
}

main().catch((error) => {
  console.error("DATABASE CONNECTION FAILED");
  console.error(error);
  process.exit(1);
});
