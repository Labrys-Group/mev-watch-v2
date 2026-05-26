import { randomUUID } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";

import {
  parseLiveLedgerSnapshot,
  snapshotFilename,
  sortSnapshotNamesNewestFirst,
} from "./snapshots";
import type { SnapshotStore } from "./store";

const DEFAULT_BLOB_PREFIX = "data/live-ledger/";
const DEFAULT_RETENTION = 10;

export interface BlobSnapshotStoreOptions {
  prefix?: string;
  retention?: number;
}

export function createBlobSnapshotStore(
  opts: BlobSnapshotStoreOptions = {},
): SnapshotStore {
  const prefix = ensureTrailingSlash(opts.prefix ?? DEFAULT_BLOB_PREFIX);
  const retention = opts.retention ?? DEFAULT_RETENTION;

  return {
    async readLatestSnapshot() {
      const [latest] = await this.listSnapshotNames();
      if (!latest) return null;

      const result = await get(`${prefix}${latest}`, {
        access: "private",
        useCache: false,
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return parseLiveLedgerSnapshot(await new Response(result.stream).json());
    },
    async writeSnapshot(snapshot) {
      const name = snapshotFilename(new Date(snapshot.fetchedAt));
      const pathname = `${prefix}${name.replace(".json", `-${randomUUID()}.json`)}`;
      await put(pathname, JSON.stringify(snapshot), {
        access: "private",
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      return pathname.slice(prefix.length);
    },
    async listSnapshotNames() {
      const names: string[] = [];
      let cursor: string | undefined;
      do {
        const result = await list({ prefix, cursor, limit: 1000 });
        names.push(
          ...result.blobs
            .map((blob) => blob.pathname.slice(prefix.length))
            .filter((name) => name.endsWith(".json")),
        );
        cursor = result.cursor;
      } while (cursor);
      return sortSnapshotNamesNewestFirst(names);
    },
    async cleanup() {
      const names = await this.listSnapshotNames();
      await Promise.all(
        names.slice(retention).map((name) =>
          del(`${prefix}${name}`).catch(() => undefined),
        ),
      );
    },
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
