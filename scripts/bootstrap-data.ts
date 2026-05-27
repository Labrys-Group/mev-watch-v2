import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";

export async function main(): Promise<void> {
  loadEnvConfig(process.cwd(), process.env.npm_lifecycle_event === "predev");
  const { bootstrapMevWatchDatabase, resolveMevWatchSqlitePath } = await import(
    "../src/lib/mev-watch-sqlite"
  );

  bootstrapMevWatchDatabase(resolveMevWatchSqlitePath());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
