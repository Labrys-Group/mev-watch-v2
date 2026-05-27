import { describe, expect, it, vi } from "vitest";

import { GENESIS_TIME } from "./chain-time";
import { refreshLiveLedger } from "./service";
import type { SnapshotStore } from "./store";
import type { LiveLedgerSnapshot } from "./types";

function memoryStore(initial: LiveLedgerSnapshot | null = null): SnapshotStore & {
  written: LiveLedgerSnapshot[];
} {
  let latest = initial;
  const written: LiveLedgerSnapshot[] = [];

  return {
    written,
    async readLatestSnapshot() {
      return latest;
    },
    async writeSnapshot(snapshot) {
      latest = snapshot;
      written.push(snapshot);
      return `${snapshot.fetchedAt}.json`;
    },
    async cleanupOldSnapshots() {
      return { deletedSnapshots: 0 };
    },
  };
}

const previousSnapshot: LiveLedgerSnapshot = {
  schemaVersion: 1,
  headSlot: 96,
  fetchedAt: new Date((GENESIS_TIME + 96 * 12) * 1000).toISOString(),
  degradedRelays: [],
  blocks: [
    {
      slot: 96,
      blockNumber: 1,
      blockHash: "0xprev",
      relays: ["relay.ultrasound.money"],
    },
  ],
};

describe("refreshLiveLedger", () => {
  it("serves a fresh previous snapshot without fetching or writing", async () => {
    const store = memoryStore(previousSnapshot);
    const fetchPayloads = vi.fn(async () => ({
      successfulRelays: ["boost-relay.flashbots.net"],
      degradedRelays: [],
      payloads: [],
    }));

    const result = await refreshLiveLedger({
      store,
      now: Date.parse(previousSnapshot.fetchedAt) + 29_999,
      fetchPayloads,
    });

    expect(fetchPayloads).not.toHaveBeenCalled();
    expect(result.wroteSnapshot).toBe(false);
    expect(store.written).toEqual([]);
    expect(result.snapshot).toEqual(previousSnapshot);
    expect(result.data.headSlot).toBe(previousSnapshot.headSlot);
  });

  it("writes a merged snapshot when at least one relay succeeds", async () => {
    const store = memoryStore(previousSnapshot);

    const result = await refreshLiveLedger({
      store,
      now: Date.parse(previousSnapshot.fetchedAt) + 30_000,
      fetchPayloads: vi.fn(async () => ({
        successfulRelays: ["boost-relay.flashbots.net"],
        degradedRelays: ["relay.ultrasound.money"],
        payloads: [
          {
            relayId: "boost-relay.flashbots.net",
            slot: 97,
            blockNumber: 2,
            blockHash: "0xnew",
          },
        ],
      })),
    });

    expect(result.wroteSnapshot).toBe(true);
    expect(store.written).toHaveLength(1);
    expect(result.snapshot.degradedRelays).toEqual(["relay.ultrasound.money"]);
    expect(result.snapshot.blocks.map((block) => block.slot)).toEqual([96, 97]);
    expect(result.data.epochs[0].slots).toContainEqual(
      expect.objectContaining({ slot: 97, category: "censoring" }),
    );
  });

  it("serves the previous snapshot unchanged when every relay fails", async () => {
    const store = memoryStore(previousSnapshot);

    const result = await refreshLiveLedger({
      store,
      now: (GENESIS_TIME + 101 * 12) * 1000,
      fetchPayloads: vi.fn(async () => ({
        successfulRelays: [],
        degradedRelays: ["relay.ultrasound.money"],
        payloads: [],
      })),
    });

    expect(result.wroteSnapshot).toBe(false);
    expect(store.written).toEqual([]);
    expect(result.snapshot).toEqual(previousSnapshot);
    expect(result.data.headSlot).toBe(previousSnapshot.headSlot);
    expect(result.data.fetchedAt).toBe(previousSnapshot.fetchedAt);
  });
});
