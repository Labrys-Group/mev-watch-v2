import { del, get, list, put } from "@vercel/blob";

import {
  isTimestampedSnapshotName,
  parseTimestampedSnapshotName,
  SNAPSHOT_RETENTION_COUNT,
  sortNewestFirst,
  timestampedSnapshotName,
  type SnapshotFile,
} from "./snapshot-files";
import { parseLiveLedgerSnapshot } from "./snapshots";
import type { SnapshotStore } from "./store";
import type { LiveLedgerSnapshot } from "./types";

const DEFAULT_BLOB_PREFIX = "data/live-ledger/";
const LATEST_SNAPSHOT_NAME = "latest.json";

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
    const blobs = await listSnapshotBlobs();

    const snapshots = await Promise.all(
      blobs
        .filter((blob) => isTimestampedSnapshotName(blob.name))
        .map(async (blob) => {
          const snapshot = await readSnapshot(blob.pathname).catch(() => null);
          return snapshot ? { name: blob.name, snapshot } : null;
        }),
    );

    return snapshots.filter((file): file is SnapshotFile => file !== null);
  }

  async function listSnapshotBlobs(): Promise<
    { name: string; pathname: string }[]
  > {
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

    return blobs.map((blob) => ({
      name: blob.pathname.slice(prefix.length),
      pathname: blob.pathname,
    }));
  }

  async function readNewestTimestampedSnapshot(): Promise<LiveLedgerSnapshot | null> {
    const snapshotBlobs = (await listSnapshotBlobs())
      .map((blob) => {
        const parsed = parseTimestampedSnapshotName(blob.name);
        return parsed ? { ...blob, ...parsed } : null;
      })
      .filter((blob): blob is NonNullable<typeof blob> => blob !== null)
      .sort((a, b) => {
        if (a.fetchedAtMs !== b.fetchedAtMs) {
          return b.fetchedAtMs - a.fetchedAtMs;
        }
        if (a.headSlot !== b.headSlot) return b.headSlot - a.headSlot;
        return a.name.localeCompare(b.name);
      });

    for (const blob of snapshotBlobs) {
      const snapshot = await readSnapshot(blob.pathname).catch(() => null);
      if (snapshot) return snapshot;
    }
    return null;
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
      const latest = await readSnapshot(`${prefix}${LATEST_SNAPSHOT_NAME}`).catch(
        () => null,
      );
      return latest ?? readNewestTimestampedSnapshot();
    },
    async writeSnapshot(snapshot) {
      const name = timestampedSnapshotName(snapshot);
      const body = JSON.stringify(snapshot);
      await putBlob(`${prefix}${name}`, body, {
        access: "private",
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      await putBlob(`${prefix}${LATEST_SNAPSHOT_NAME}`, body, {
        access: "private",
        allowOverwrite: true,
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
