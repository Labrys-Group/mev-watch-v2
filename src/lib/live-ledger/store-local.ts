import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";

import {
  parseLiveLedgerSnapshot,
  snapshotFilename,
  sortSnapshotNamesNewestFirst,
} from "./snapshots";
import type { SnapshotStore } from "./store";

const DEFAULT_LOCAL_DIR = "data/live-ledger";
const DEFAULT_RETENTION = 10;

export interface LocalSnapshotStoreOptions {
  dir?: string;
  retention?: number;
}

export function createLocalSnapshotStore(
  opts: LocalSnapshotStoreOptions = {},
): SnapshotStore {
  const dir = opts.dir ?? DEFAULT_LOCAL_DIR;
  const retention = opts.retention ?? DEFAULT_RETENTION;

  return {
    async readLatestSnapshot() {
      const [latest] = await this.listSnapshotNames();
      if (!latest) return null;
      const raw = await fs.readFile(filePath(dir, latest), "utf8");
      return parseLiveLedgerSnapshot(JSON.parse(raw));
    },
    async writeSnapshot(snapshot) {
      await fs.mkdir(dir, { recursive: true });
      const name = await uniqueLocalName(
        dir,
        snapshotFilename(new Date(snapshot.fetchedAt)),
      );
      await fs.writeFile(
        filePath(dir, name),
        `${JSON.stringify(snapshot, null, 2)}\n`,
        "utf8",
      );
      return name;
    },
    async listSnapshotNames() {
      try {
        const entries = await fs.readdir(dir);
        return sortSnapshotNamesNewestFirst(entries);
      } catch (error) {
        if (isNotFoundError(error)) return [];
        throw error;
      }
    },
    async cleanup() {
      const names = await this.listSnapshotNames();
      await Promise.all(
        names.slice(retention).map((name) =>
          fs.rm(filePath(dir, name), {
            force: true,
          }).catch(() => undefined),
        ),
      );
    },
  };
}

async function uniqueLocalName(dir: string, baseName: string): Promise<string> {
  const fullPath = filePath(dir, baseName);
  try {
    await fs.access(fullPath);
    return baseName.replace(".json", `-${randomUUID()}.json`);
  } catch {
    return baseName;
  }
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
