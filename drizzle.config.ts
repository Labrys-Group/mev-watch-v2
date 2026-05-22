import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Required for a hosted Turso (libsql://) database; ignored for a local
    // file: URL, where it is empty.
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
