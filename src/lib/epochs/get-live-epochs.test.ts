import { describe, it, expect } from "vitest";
import { getLiveEpochs } from "./get-live-epochs";
import { GENESIS_TIME, SLOTS_PER_EPOCH } from "./chain-time";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";

const EPOCH = 1000;
const HEAD_SLOT = EPOCH * SLOTS_PER_EPOCH + 10; // slot index 10 of epoch 1000
const NOW = (GENESIS_TIME + HEAD_SLOT * 12) * 1000;

function store(blocks: StoredBlock[]): RecentBlocksStore {
  return {
    readWindow: async () => blocks,
    upsertBlocks: async () => {},
  };
}

function block(slot: number, relays: string[]): StoredBlock {
  return {
    slot,
    blockNumber: 1,
    relays,
    builder: "0xbuilder",
    valueWei: "1000",
    numTx: 100,
  };
}

describe("getLiveEpochs", () => {
  it("returns four rows, newest first, in-progress at the top", async () => {
    const data = await getLiveEpochs(store([]), NOW);
    expect(data.epochs).toHaveLength(4);
    expect(data.epochs[0].epoch).toBe(EPOCH);
    expect(data.epochs[0].inProgress).toBe(true);
    expect(data.epochs[3].epoch).toBe(EPOCH - 3);
    expect(data.epochs[3].inProgress).toBe(false);
  });

  it("marks not-yet-happened slots of the in-progress epoch as pending", async () => {
    const data = await getLiveEpochs(store([]), NOW);
    const top = data.epochs[0];
    expect(top.slots[11].category).toBe("pending"); // > head
    expect(top.slots[31].category).toBe("pending");
  });

  it("keeps the most-recent slots pending while inside the nonboost grace window", async () => {
    // head is at slot index 10. With NONBOOST_GRACE_SLOTS = 3, an undelivered
    // slot at indices 8, 9, 10 should be pending (settling), while index 7
    // and earlier should commit to nonboost.
    const data = await getLiveEpochs(store([]), NOW);
    const top = data.epochs[0];
    expect(top.slots[10].category).toBe("pending");
    expect(top.slots[9].category).toBe("pending");
    expect(top.slots[8].category).toBe("pending");
    expect(top.slots[7].category).toBe("nonboost");
  });

  it("classifies in-grace slots from relay data when available", async () => {
    // A relay row landed for the head slot — the grace window should not
    // override an actually-delivered block.
    const data = await getLiveEpochs(
      store([block(HEAD_SLOT, ["boost-relay.flashbots.net"])]),
      NOW,
    );
    expect(data.epochs[0].slots[10].category).toBe("censoring");
  });

  it("classifies a slot censoring when a censoring relay delivered it", async () => {
    const slot = (EPOCH - 1) * SLOTS_PER_EPOCH + 5;
    const data = await getLiveEpochs(
      store([block(slot, ["boost-relay.flashbots.net"])]),
      NOW,
    );
    const cell = data.epochs[1].slots[5];
    expect(cell.category).toBe("censoring");
    expect(cell.relays).toContain("boost-relay.flashbots.net");
  });

  it("classifies an undelivered past slot as nonboost", async () => {
    const data = await getLiveEpochs(store([]), NOW);
    expect(data.epochs[1].slots[0].category).toBe("nonboost");
  });

  it("returns four rows without throwing when the store read fails", async () => {
    const broken: RecentBlocksStore = {
      readWindow: async () => {
        throw new Error("db down");
      },
      upsertBlocks: async () => {},
    };
    const data = await getLiveEpochs(broken, NOW);
    expect(data.epochs).toHaveLength(4);
  });
});
