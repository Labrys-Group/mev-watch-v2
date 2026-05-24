import { describe, it, expect } from "vitest";
import { foldPayloads, ingestRecentBlocks } from "./ingest";
import { RELAYS } from "@/config/relays";
import type { DeliveredPayload, PayloadSource } from "./relay-payloads";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";

function payload(slot: number, relayId: string): DeliveredPayload {
  return {
    slot,
    blockHash: "0xblk",
    builderPubkey: "0xbuilder",
    valueWei: "1000",
    numTx: 10,
    blockNumber: slot,
    relayId,
  };
}

function fakeStore() {
  const upserted: { blocks: StoredBlock[]; head: number }[] = [];
  const store: RecentBlocksStore = {
    readWindow: async () => [],
    upsertBlocks: async (blocks, head) => {
      upserted.push({ blocks, head });
    },
  };
  return { store, upserted };
}

describe("foldPayloads", () => {
  it("merges relays that delivered the same slot into one block", () => {
    const folded = foldPayloads([
      payload(100, "boost-relay.flashbots.net"),
      payload(100, "relay.ultrasound.money"),
    ]);
    expect(folded).toHaveLength(1);
    expect(folded[0].slot).toBe(100);
    expect(folded[0].relays).toEqual(
      ["boost-relay.flashbots.net", "relay.ultrasound.money"].sort(),
    );
  });

  it("keeps distinct slots separate", () => {
    const folded = foldPayloads([
      payload(100, "relay.ultrasound.money"),
      payload(101, "relay.ultrasound.money"),
    ]);
    expect(folded.map((b) => b.slot).sort((a, b) => a - b)).toEqual([100, 101]);
  });
});

describe("ingestRecentBlocks", () => {
  it("folds fetched payloads and upserts them", async () => {
    const { store, upserted } = fakeStore();
    const source: PayloadSource = {
      fetchRecentDeliveries: async () => ({
        payloads: [payload(100, "boost-relay.flashbots.net")],
        okRelays: ["boost-relay.flashbots.net"],
        failedRelays: [],
      }),
    };
    const result = await ingestRecentBlocks(source, store);
    expect(upserted).toHaveLength(1);
    expect(upserted[0].blocks[0].slot).toBe(100);
    expect(result.relaysOk).toBe(1);
    expect(result.relaysTotal).toBe(1);
  });

  it("propagates the failedRelays list (not just the count) into IngestResult", async () => {
    const { store } = fakeStore();
    const source: PayloadSource = {
      fetchRecentDeliveries: async () => ({
        payloads: [payload(100, "relay.ultrasound.money")],
        okRelays: ["relay.ultrasound.money"],
        failedRelays: [
          "bloxroute.max-profit.blxrbdn.com",
          "bloxroute.regulated.blxrbdn.com",
        ],
      }),
    };
    const result = await ingestRecentBlocks(source, store);
    expect(result.failedRelays).toEqual([
      "bloxroute.max-profit.blxrbdn.com",
      "bloxroute.regulated.blxrbdn.com",
    ]);
    expect(result.relaysOk).toBe(1);
    expect(result.relaysTotal).toBe(3);
  });

  it("reports every configured relay as failed when the source itself throws (preserves failedRelays.length === relaysTotal - relaysOk)", async () => {
    const { store } = fakeStore();
    const source: PayloadSource = {
      fetchRecentDeliveries: async () => {
        throw new Error("network down");
      },
    };
    const result = await ingestRecentBlocks(source, store);
    expect(result.failedRelays).toEqual(RELAYS.map((r) => r.id));
    expect(result.failedRelays.length).toBe(
      result.relaysTotal - result.relaysOk,
    );
  });

  it("returns relaysOk 0 and leaves the store untouched when the source throws", async () => {
    const { store, upserted } = fakeStore();
    const source: PayloadSource = {
      fetchRecentDeliveries: async () => {
        throw new Error("network down");
      },
    };
    const result = await ingestRecentBlocks(source, store);
    expect(result.relaysOk).toBe(0);
    expect(result.relaysTotal).toBeGreaterThan(0);
    expect(upserted).toHaveLength(0);
  });
});
