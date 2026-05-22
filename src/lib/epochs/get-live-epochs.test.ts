import { describe, it, expect } from "vitest";
import { getLiveEpochs } from "./get-live-epochs";
import { GENESIS_TIME, SLOTS_PER_EPOCH } from "./chain-time";
import type { DeliveredPayload, PayloadSource } from "./relay-payloads";

const EPOCH = 1000;
const HEAD_SLOT = EPOCH * SLOTS_PER_EPOCH + 10; // slot index 10 of epoch 1000
const NOW = (GENESIS_TIME + HEAD_SLOT * 12) * 1000;

function source(payloads: DeliveredPayload[]): PayloadSource {
  return {
    fetchRecentDeliveries: async () => ({
      payloads,
      okRelays: ["relay.ultrasound.money"],
      failedRelays: [],
    }),
  };
}

function payload(slot: number, relayId: string): DeliveredPayload {
  return {
    slot,
    blockHash: "0xblk",
    builderPubkey: "0xbuilder",
    valueWei: "1000",
    numTx: 100,
    blockNumber: 1,
    relayId,
  };
}

describe("getLiveEpochs", () => {
  it("returns four rows, newest first, in-progress at the top", async () => {
    const data = await getLiveEpochs(source([]), NOW);
    expect(data.epochs).toHaveLength(4);
    expect(data.epochs[0].epoch).toBe(EPOCH);
    expect(data.epochs[0].inProgress).toBe(true);
    expect(data.epochs[3].epoch).toBe(EPOCH - 3);
    expect(data.epochs[3].inProgress).toBe(false);
  });

  it("marks not-yet-happened slots of the in-progress epoch as pending", async () => {
    const data = await getLiveEpochs(source([]), NOW);
    const top = data.epochs[0];
    expect(top.slots[10].category).not.toBe("pending"); // == head, happened
    expect(top.slots[11].category).toBe("pending"); // > head
    expect(top.slots[31].category).toBe("pending");
  });

  it("classifies a slot censoring when a censoring relay delivered it", async () => {
    const slot = (EPOCH - 1) * SLOTS_PER_EPOCH + 5;
    const data = await getLiveEpochs(
      source([payload(slot, "boost-relay.flashbots.net")]),
      NOW,
    );
    const cell = data.epochs[1].slots[5];
    expect(cell.category).toBe("censoring");
    expect(cell.relays).toContain("boost-relay.flashbots.net");
  });

  it("classifies an undelivered past slot as nonboost", async () => {
    const data = await getLiveEpochs(source([]), NOW);
    expect(data.epochs[1].slots[0].category).toBe("nonboost");
  });

  it("returns safe defaults without throwing when the source fails", async () => {
    const broken: PayloadSource = {
      fetchRecentDeliveries: async () => {
        throw new Error("network down");
      },
    };
    const data = await getLiveEpochs(broken, NOW);
    expect(data.epochs).toHaveLength(4);
    expect(data.relaysOk).toBe(0);
    expect(data.relaysTotal).toBeGreaterThan(0);
  });
});
