import { pathToFileURL } from "node:url";
import {
  bootstrapMevWatchDatabase,
  SQLITE_DATA_PATH,
} from "../src/lib/mev-watch-sqlite";

export function main(): void {
  bootstrapMevWatchDatabase(SQLITE_DATA_PATH);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
