import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Pass authToken only for a hosted Turso (libsql://) database. A local
    // file: URL needs none, and drizzle-kit's turso dialect rejects an
    // empty-string token — so the key must be omitted entirely when unset.
    ...(authToken ? { authToken } : {}),
  },
});
