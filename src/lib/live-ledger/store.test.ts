import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createLocalSnapshotStore } from "./store-local";
import type { LiveLedgerSnapshot } from "./types";

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "live-ledger-store-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function snapshot(slot: number, fetchedAt: string): LiveLedgerSnapshot {
  return {
    schemaVersion: 1,
    headSlot: slot,
    fetchedAt,
    degradedRelays: [],
    blocks: [],
  };
}

describe("local live ledger snapshot store", () => {
  it("overwrites and reads a single latest snapshot", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      await store.writeSnapshot(snapshot(1, "2026-05-26T00:00:00.000Z"));
      await store.writeSnapshot(snapshot(2, "2026-05-26T00:00:01.000Z"));
      await store.writeSnapshot(snapshot(3, "2026-05-26T00:00:02.000Z"));

      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 3,
      });
      await expect(store.writeSnapshot(snapshot(4, "2026-05-26T00:00:03.000Z"))).resolves.toBe(
        "latest.json",
      );
      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 4,
      });
    });
  });
});
