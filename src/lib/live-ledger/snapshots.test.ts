import { describe, expect, it } from "vitest";

import {
  classifySlot,
  foldPayloadsBySlot,
  ledgerFromSnapshot,
  mergeSnapshotBlocks,
  pruneSnapshotBlocks,
} from "./snapshots";
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
});
