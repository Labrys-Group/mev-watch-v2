import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getDatabaseUrl } from "../env";
import * as schema from "./schema";

const client = createClient({
  url: getDatabaseUrl(),
  // Required for a hosted Turso database (libsql:// URL); absent/ignored for a
  // local file: URL.
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
