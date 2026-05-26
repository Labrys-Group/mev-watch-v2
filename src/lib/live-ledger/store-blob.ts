import { get, put } from "@vercel/blob";

import { parseLiveLedgerSnapshot } from "./snapshots";
import type { SnapshotStore } from "./store";

const DEFAULT_BLOB_PREFIX = "data/live-ledger/";
const LATEST_SNAPSHOT_NAME = "latest.json";

export interface BlobSnapshotStoreOptions {
  prefix?: string;
}

export function createBlobSnapshotStore(
  opts: BlobSnapshotStoreOptions = {},
): SnapshotStore {
  const prefix = ensureTrailingSlash(opts.prefix ?? DEFAULT_BLOB_PREFIX);
  const pathname = `${prefix}${LATEST_SNAPSHOT_NAME}`;

  return {
    async readLatestSnapshot() {
      const result = await get(pathname, {
        access: "private",
        useCache: false,
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return parseLiveLedgerSnapshot(await new Response(result.stream).json());
    },
    async writeSnapshot(snapshot) {
      await put(pathname, JSON.stringify(snapshot), {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      return pathname.slice(prefix.length);
    },
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
