import { promises as fs } from "node:fs";

import {
  isTimestampedSnapshotName,
  newestSnapshotFile,
  SNAPSHOT_RETENTION_COUNT,
  sortNewestFirst,
  timestampedSnapshotName,
  type SnapshotFile,
} from "./snapshot-files";
import { parseLiveLedgerSnapshot } from "./snapshots";
import type { SnapshotStore } from "./store";
import type { LiveLedgerSnapshot } from "./types";

const DEFAULT_LOCAL_DIR = "data/live-ledger";

export interface LocalSnapshotStoreOptions {
  dir?: string;
}

export function createLocalSnapshotStore(
  opts: LocalSnapshotStoreOptions = {},
): SnapshotStore {
  const dir = opts.dir ?? DEFAULT_LOCAL_DIR;

  return {
    async readLatestSnapshot() {
      const latest = newestSnapshotFile(await readTimestampedSnapshots(dir));
      if (latest) return latest.snapshot;
      return null;
    },
    async writeSnapshot(snapshot) {
      await fs.mkdir(dir, { recursive: true });
      const name = timestampedSnapshotName(snapshot);
      const tempName = `${name}.tmp`;
      await fs.writeFile(
        filePath(dir, tempName),
        `${JSON.stringify(snapshot, null, 2)}\n`,
        "utf8",
      );
      await fs.rename(filePath(dir, tempName), filePath(dir, name));
      return name;
    },
    cleanupOldSnapshots() {
      return pruneOldSnapshots(dir);
    },
  };
}

async function readTimestampedSnapshots(dir: string): Promise<SnapshotFile[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }

  const snapshots = await Promise.all(
    names.filter(isTimestampedSnapshotName).map(async (name) => {
      const snapshot = await readSnapshotFile(dir, name).catch(() => null);
      return snapshot ? { name, snapshot } : null;
    }),
  );

  return snapshots.filter((file): file is SnapshotFile => file !== null);
}

async function readSnapshotFile(
  dir: string,
  name: string,
): Promise<LiveLedgerSnapshot> {
  const raw = await fs.readFile(filePath(dir, name), "utf8");
  return parseLiveLedgerSnapshot(JSON.parse(raw));
}

async function pruneOldSnapshots(
  dir: string,
): Promise<{ deletedSnapshots: number }> {
  const snapshots = sortNewestFirst(await readTimestampedSnapshots(dir));
  const staleSnapshots = snapshots.slice(SNAPSHOT_RETENTION_COUNT);
  await Promise.all(
    staleSnapshots.map((file) => fs.rm(filePath(dir, file.name), { force: true })),
  );
  return { deletedSnapshots: staleSnapshots.length };
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
