import { BlobPreconditionFailedError, get, put } from "@vercel/blob";

import { isNewerSnapshot, parseLiveLedgerSnapshot } from "./snapshots";
import type { SnapshotStore } from "./store";
import type { LiveLedgerSnapshot } from "./types";

const DEFAULT_BLOB_PREFIX = "data/live-ledger/";
const LATEST_SNAPSHOT_NAME = "latest.json";
const MAX_WRITE_ATTEMPTS = 3;

export interface BlobSnapshotStoreOptions {
  prefix?: string;
  getBlob?: typeof get;
  putBlob?: typeof put;
}

interface LatestSnapshot {
  etag: string | null;
  snapshot: LiveLedgerSnapshot;
}

export function createBlobSnapshotStore(
  opts: BlobSnapshotStoreOptions = {},
): SnapshotStore {
  const prefix = ensureTrailingSlash(opts.prefix ?? DEFAULT_BLOB_PREFIX);
  const pathname = `${prefix}${LATEST_SNAPSHOT_NAME}`;
  const getBlob = opts.getBlob ?? get;
  const putBlob = opts.putBlob ?? put;

  async function readLatestSnapshotWithEtag(): Promise<LatestSnapshot | null> {
    const result = await getBlob(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return {
      etag: result.blob.etag ?? null,
      snapshot: parseLiveLedgerSnapshot(await new Response(result.stream).json()),
    };
  }

  return {
    async readLatestSnapshot() {
      return (await readLatestSnapshotWithEtag())?.snapshot ?? null;
    },
    async writeSnapshot(snapshot) {
      for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
        const latest = await readLatestSnapshotWithEtag();
        if (latest && !isNewerSnapshot(snapshot, latest.snapshot)) {
          return pathname.slice(prefix.length);
        }

        try {
          await putBlob(pathname, JSON.stringify(snapshot), {
            access: "private",
            allowOverwrite: Boolean(latest),
            contentType: "application/json",
            cacheControlMaxAge: 60,
            ...(latest?.etag ? { ifMatch: latest.etag } : {}),
          });
          return pathname.slice(prefix.length);
        } catch (error) {
          if (isBlobPreconditionFailedError(error)) continue;
          throw error;
        }
      }
      throw new Error(`unable to write ${pathname}: latest snapshot changed repeatedly`);
    },
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isBlobPreconditionFailedError(error: unknown): boolean {
  return (
    error instanceof BlobPreconditionFailedError ||
    (error instanceof Error &&
      (error.name === "BlobPreconditionFailedError" ||
        (error.message.includes("Precondition failed") &&
          error.message.includes("ETag mismatch"))))
  );
}
