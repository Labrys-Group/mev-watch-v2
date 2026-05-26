import { promises as fs } from "node:fs";

import { parseLiveLedgerSnapshot } from "./snapshots";
import type { SnapshotStore } from "./store";

const DEFAULT_LOCAL_DIR = "data/live-ledger";
const LATEST_SNAPSHOT_NAME = "latest.json";

export interface LocalSnapshotStoreOptions {
  dir?: string;
}

export function createLocalSnapshotStore(
  opts: LocalSnapshotStoreOptions = {},
): SnapshotStore {
  const dir = opts.dir ?? DEFAULT_LOCAL_DIR;

  return {
    async readLatestSnapshot() {
      try {
        const raw = await fs.readFile(filePath(dir, LATEST_SNAPSHOT_NAME), "utf8");
        return parseLiveLedgerSnapshot(JSON.parse(raw));
      } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
      }
    },
    async writeSnapshot(snapshot) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        filePath(dir, LATEST_SNAPSHOT_NAME),
        `${JSON.stringify(snapshot, null, 2)}\n`,
        "utf8",
      );
      return LATEST_SNAPSHOT_NAME;
    },
  };
}

function filePath(dir: string, name: string): string {
  return `${dir.replace(/\/$/, "")}/${name}`;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
