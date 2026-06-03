import { describe, expect, it } from "vitest";

import {
  buildSnapshot,
  classifySlot,
  foldPayloadsBySlot,
  ledgerFromSnapshot,
  mergeSnapshotBlocks,
  parseLiveLedgerSnapshot,
  pruneSnapshotBlocks,
} from "./snapshots";
import { GENESIS_TIME } from "./chain-time";
import type { LiveLedgerSnapshot, RelayPayload } from "./types";

describe("live ledger snapshots", () => {
  it("folds multi-relay payloads into one row per slot", () => {
    const payloads: RelayPayload[] = [
      {
        relayId: "relay.ultrasound.money",
        slot: 96,
        blockNumber: 10,
        blockHash: "0xa",
        builderPubkey: "0xbuilder",
        valueWei: "1",
        numTx: 3,
      },
      {
        relayId: "boost-relay.flashbots.net",
        slot: 96,
        blockNumber: 10,
        blockHash: "0xa",
        builderPubkey: "0xbuilder",
        valueWei: "1",
        numTx: 3,
      },
    ];

    expect(foldPayloadsBySlot(payloads)).toEqual([
      {
        slot: 96,
        blockNumber: 10,
        blockHash: "0xa",
        builderPubkey: "0xbuilder",
        valueWei: "1",
        numTx: 3,
        relays: ["boost-relay.flashbots.net", "relay.ultrasound.money"],
      },
    ]);
  });

  it("classifies delivered slots with censoring path wins", () => {
    expect(classifySlot(["relay.ultrasound.money"])).toBe("neutral");
    expect(classifySlot(["relay.ultrasound.money", "boost-relay.flashbots.net"])).toBe(
      "censoring",
    );
    expect(classifySlot([])).toBe("nonboost");
  });

  it("merges rows idempotently by slot and prunes the rolling window", () => {
    const existing = [
      {
        slot: 10,
        blockNumber: 1,
        blockHash: "0xold",
        relays: ["relay.ultrasound.money"],
      },
      {
        slot: 100,
        blockNumber: 2,
        blockHash: "0xkeep",
        relays: ["relay.ultrasound.money"],
      },
    ];
    const incoming = [
      {
        slot: 100,
        blockNumber: 2,
        blockHash: "0xkeep",
        relays: ["boost-relay.flashbots.net"],
      },
    ];

    const merged = mergeSnapshotBlocks(existing, incoming);
    expect(merged.find((block) => block.slot === 100)?.relays).toEqual([
      "boost-relay.flashbots.net",
      "relay.ultrasound.money",
    ]);
    expect(pruneSnapshotBlocks(merged, 300)).toEqual([
      expect.objectContaining({ slot: 100 }),
    ]);
  });

  it("converts a snapshot into current plus previous three epoch rows", () => {
    const snapshot: LiveLedgerSnapshot = {
      schemaVersion: 1,
      headSlot: 99,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: [],
      blocks: [
        {
          slot: 96,
          blockNumber: 1,
          blockHash: "0x96",
          relays: ["relay.ultrasound.money"],
        },
        {
          slot: 97,
          blockNumber: 2,
          blockHash: "0x97",
          relays: ["boost-relay.flashbots.net"],
        },
      ],
    };

    const ledger = ledgerFromSnapshot(snapshot);

    expect(ledger.headSlot).toBe(99);
    expect(ledger.epochs.map((row) => row.epoch)).toEqual([3, 2, 1, 0]);
    expect(ledger.epochs[0].inProgress).toBe(true);
    expect(ledger.epochs[0].slots[0]).toMatchObject({
      slot: 96,
      indexInEpoch: 0,
      category: "neutral",
    });
    expect(ledger.epochs[0].slots[1]).toMatchObject({
      slot: 97,
      category: "censoring",
    });
    expect(ledger.epochs[0].slots[4]).toMatchObject({
      slot: 100,
      category: "pending",
    });
  });

  it("marks only missing past slots inside degraded ranges as unknown", () => {
    const snapshot = {
      schemaVersion: 1,
      headSlot: 99,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: ["relay.ultrasound.money"],
      degradedSlotRanges: [{ firstSlot: 97, lastSlot: 99 }],
      blocks: [
        {
          slot: 96,
          blockNumber: 1,
          blockHash: "0x96",
          relays: ["boost-relay.flashbots.net"],
        },
      ],
    } satisfies LiveLedgerSnapshot & {
      degradedSlotRanges: Array<{ firstSlot: number; lastSlot: number }>;
    };

    const ledger = ledgerFromSnapshot(snapshot);

    expect(ledger.epochs[1].slots[31]).toMatchObject({
      slot: 95,
      category: "nonboost",
    });
    expect(ledger.epochs[0].slots[0]).toMatchObject({
      slot: 96,
      category: "censoring",
    });
    expect(ledger.epochs[0].slots[1]).toMatchObject({
      slot: 97,
      category: "unknown",
    });
    expect(ledger.epochs[0].slots[4]).toMatchObject({
      slot: 100,
      category: "pending",
    });
  });

  it("preserves missing degraded ranges when parsing legacy degraded snapshots", () => {
    const snapshot = parseLiveLedgerSnapshot({
      schemaVersion: 1,
      headSlot: 99,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: ["relay.ultrasound.money"],
      blocks: [],
    });

    expect("degradedSlotRanges" in snapshot).toBe(false);
    expect(snapshot.degradedSlotRanges).toBeUndefined();
  });

  it("marks missing past slots in legacy degraded snapshots as unknown", () => {
    const snapshot: LiveLedgerSnapshot = {
      schemaVersion: 1,
      headSlot: 99,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: ["relay.ultrasound.money"],
      blocks: [
        {
          slot: 96,
          blockNumber: 1,
          blockHash: "0x96",
          relays: ["boost-relay.flashbots.net"],
        },
      ],
    };

    const ledger = ledgerFromSnapshot(snapshot);

    expect(ledger.epochs[0].slots[0]).toMatchObject({
      slot: 96,
      category: "censoring",
    });
    expect(ledger.epochs[0].slots[1]).toMatchObject({
      slot: 97,
      category: "unknown",
    });
  });

  it("records degraded ranges for newly elapsed slots without repainting older gaps", () => {
    const previous: LiveLedgerSnapshot = {
      schemaVersion: 1,
      headSlot: 96,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: [],
      blocks: [
        {
          slot: 96,
          blockNumber: 1,
          blockHash: "0x96",
          relays: ["relay.ultrasound.money"],
        },
      ],
    };

    const snapshot = buildSnapshot({
      previous,
      incoming: [],
      degradedRelays: ["relay.ultrasound.money"],
      now: (GENESIS_TIME + 101 * 12) * 1000,
    });
    const ledger = ledgerFromSnapshot(snapshot);

    expect(
      (
        snapshot as LiveLedgerSnapshot & {
          degradedSlotRanges?: Array<{ firstSlot: number; lastSlot: number }>;
        }
      ).degradedSlotRanges,
    ).toEqual([{ firstSlot: 97, lastSlot: 101 }]);
    expect(ledger.epochs[1].slots[31]).toMatchObject({
      slot: 95,
      category: "nonboost",
    });
    expect(ledger.epochs[0].slots).toContainEqual(
      expect.objectContaining({ slot: 97, category: "unknown" }),
    );
    expect(ledger.epochs[0].slots).toContainEqual(
      expect.objectContaining({ slot: 101, category: "unknown" }),
    );
  });

  it("carries, merges, and prunes degraded ranges when building snapshots", () => {
    const previous = {
      schemaVersion: 1,
      headSlot: 299,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: [],
      degradedSlotRanges: [
        { firstSlot: 10, lastSlot: 20 },
        { firstSlot: 250, lastSlot: 260 },
        { firstSlot: 295, lastSlot: 299 },
      ],
      blocks: [],
    } satisfies LiveLedgerSnapshot & {
      degradedSlotRanges: Array<{ firstSlot: number; lastSlot: number }>;
    };

    const snapshot = buildSnapshot({
      previous,
      incoming: [],
      degradedRelays: ["relay.ultrasound.money"],
      now: (GENESIS_TIME + 305 * 12) * 1000,
    });

    expect(
      (
        snapshot as LiveLedgerSnapshot & {
          degradedSlotRanges?: Array<{ firstSlot: number; lastSlot: number }>;
        }
      ).degradedSlotRanges,
    ).toEqual([
      { firstSlot: 250, lastSlot: 260 },
      { firstSlot: 295, lastSlot: 305 },
    ]);
  });

  it("carries legacy degraded history when building snapshots", () => {
    const previous: LiveLedgerSnapshot = {
      schemaVersion: 1,
      headSlot: 299,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: ["relay.ultrasound.money"],
      blocks: [],
    };

    const snapshot = buildSnapshot({
      previous,
      incoming: [],
      degradedRelays: ["relay.ultrasound.money"],
      now: (GENESIS_TIME + 305 * 12) * 1000,
    });

    expect(snapshot.degradedSlotRanges).toEqual([
      { firstSlot: 49, lastSlot: 305 },
    ]);
  });
});
