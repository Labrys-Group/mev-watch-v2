import { describe, expect, it } from "vitest";

import {
  GENESIS_TIME,
  SLOTS_PER_EPOCH,
  currentSlot,
  epochOf,
  epochSlotRange,
} from "./chain-time";

describe("live ledger chain time", () => {
  it("computes the current slot from mainnet genesis", () => {
    expect(currentSlot(GENESIS_TIME * 1000)).toBe(0);
    expect(currentSlot((GENESIS_TIME + 12) * 1000)).toBe(1);
    expect(currentSlot((GENESIS_TIME + 31 * 12) * 1000)).toBe(31);
  });

  it("groups slots into 32-slot epochs", () => {
    expect(epochOf(0)).toBe(0);
    expect(epochOf(31)).toBe(0);
    expect(epochOf(32)).toBe(1);
    expect(epochOf(449_440 * SLOTS_PER_EPOCH)).toBe(449_440);
  });

  it("returns inclusive epoch slot bounds", () => {
    expect(epochSlotRange(2)).toEqual({ first: 64, last: 95 });
  });
});
