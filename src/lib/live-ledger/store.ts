import type { LiveLedgerSnapshot } from "./types";

export interface SnapshotStore {
  readLatestSnapshot(): Promise<LiveLedgerSnapshot | null>;
  writeSnapshot(snapshot: LiveLedgerSnapshot): Promise<string>;
}

export async function createSnapshotStore(): Promise<SnapshotStore> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { createBlobSnapshotStore } = await import("./store-blob");
    return createBlobSnapshotStore({
      prefix: process.env.MEV_WATCH_LIVE_BLOB_PREFIX,
    });
  }

  const { createLocalSnapshotStore } = await import("./store-local");
  return createLocalSnapshotStore({
    dir: process.env.MEV_WATCH_LIVE_SNAPSHOT_DIR,
  });
}
