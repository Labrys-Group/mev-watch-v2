import { randomUUID } from "node:crypto";

import { isNewerSnapshot } from "./snapshots";
import type { LiveLedgerSnapshot } from "./types";

export const LATEST_SNAPSHOT_NAME = "latest.json";
export const SNAPSHOT_RETENTION_COUNT = 10;

export interface SnapshotFile {
  name: string;
  snapshot: LiveLedgerSnapshot;
}

export function timestampedSnapshotName(snapshot: LiveLedgerSnapshot): string {
  return `${safeTimestamp(snapshot.fetchedAt)}-head-${snapshot.headSlot}-${randomUUID()}.json`;
}

export function isTimestampedSnapshotName(name: string): boolean {
  return (
    name.endsWith(".json") &&
    name !== LATEST_SNAPSHOT_NAME &&
    !name.endsWith(".tmp")
  );
}

export function newestSnapshotFile(
  files: SnapshotFile[],
): SnapshotFile | null {
  return files.reduce<SnapshotFile | null>((latest, file) => {
    if (!latest) return file;
    return isNewerSnapshot(file.snapshot, latest.snapshot) ? file : latest;
  }, null);
}

export function sortNewestFirst(files: SnapshotFile[]): SnapshotFile[] {
  return [...files].sort((a, b) => {
    if (isNewerSnapshot(a.snapshot, b.snapshot)) return -1;
    if (isNewerSnapshot(b.snapshot, a.snapshot)) return 1;
    return a.name.localeCompare(b.name);
  });
}

function safeTimestamp(value: string): string {
  return value.replace(/[:.]/g, "-").replace(/[^A-Za-z0-9TZ-]/g, "-");
}
