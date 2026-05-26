import { del, get, list, put } from "@vercel/blob";

import {
  isTimestampedSnapshotName,
  LATEST_SNAPSHOT_NAME,
  newestSnapshotFile,
  SNAPSHOT_RETENTION_COUNT,
  sortNewestFirst,
  timestampedSnapshotName,
  type SnapshotFile,
} from "./snapshot-files";
import { parseLiveLedgerSnapshot } from "./snapshots";
import type { SnapshotStore } from "./store";
import type { LiveLedgerSnapshot } from "./types";

const DEFAULT_BLOB_PREFIX = "data/live-ledger/";

export interface BlobSnapshotStoreOptions {
  prefix?: string;
  getBlob?: typeof get;
  putBlob?: typeof put;
  listBlob?: typeof list;
  delBlob?: typeof del;
}

export function createBlobSnapshotStore(
  opts: BlobSnapshotStoreOptions = {},
): SnapshotStore {
  const prefix = ensureTrailingSlash(opts.prefix ?? DEFAULT_BLOB_PREFIX);
  const legacyLatestPathname = `${prefix}${LATEST_SNAPSHOT_NAME}`;
  const getBlob = opts.getBlob ?? get;
  const putBlob = opts.putBlob ?? put;
  const listBlob = opts.listBlob ?? list;
  const delBlob = opts.delBlob ?? del;

  async function readSnapshot(pathname: string): Promise<LiveLedgerSnapshot | null> {
    const result = await getBlob(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return parseLiveLedgerSnapshot(await new Response(result.stream).json());
  }

  async function readTimestampedSnapshots(): Promise<SnapshotFile[]> {
    const blobs = [];
    let cursor: string | undefined;

    do {
      const result = await listBlob({
        prefix,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      blobs.push(...result.blobs);
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    const snapshots = await Promise.all(
      blobs
        .map((blob) => ({
          name: blob.pathname.slice(prefix.length),
          pathname: blob.pathname,
        }))
        .filter((blob) => isTimestampedSnapshotName(blob.name))
        .map(async (blob) => {
          const snapshot = await readSnapshot(blob.pathname).catch(() => null);
          return snapshot ? { name: blob.name, snapshot } : null;
        }),
    );

    return snapshots.filter((file): file is SnapshotFile => file !== null);
  }

  async function pruneOldSnapshots(): Promise<{ deletedSnapshots: number }> {
    const snapshots = sortNewestFirst(await readTimestampedSnapshots());
    const staleSnapshots = snapshots.slice(SNAPSHOT_RETENTION_COUNT);
    await Promise.all(
      staleSnapshots.map((file) => delBlob(`${prefix}${file.name}`)),
    );
    return { deletedSnapshots: staleSnapshots.length };
  }

  return {
    async readLatestSnapshot() {
      const latest = newestSnapshotFile(await readTimestampedSnapshots());
      if (latest) return latest.snapshot;
      return readSnapshot(legacyLatestPathname);
    },
    async writeSnapshot(snapshot) {
      const name = timestampedSnapshotName(snapshot);
      await putBlob(`${prefix}${name}`, JSON.stringify(snapshot), {
        access: "private",
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      return name;
    },
    cleanupOldSnapshots() {
      return pruneOldSnapshots();
    },
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
