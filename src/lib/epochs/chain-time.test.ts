import { describe, it, expect } from "vitest";
import {
  GENESIS_TIME,
  SLOTS_PER_EPOCH,
  currentSlot,
  epochOf,
  epochSlotRange,
} from "./chain-time";

describe("chain-time", () => {
  it("currentSlot is 0 at genesis", () => {
    expect(currentSlot(GENESIS_TIME * 1000)).toBe(0);
  });

  it("currentSlot advances one per 12 seconds", () => {
    expect(currentSlot((GENESIS_TIME + 12) * 1000)).toBe(1);
    expect(currentSlot((GENESIS_TIME + 32 * 12) * 1000)).toBe(32);
  });

  it("epochOf groups 32 slots per epoch", () => {
    expect(epochOf(0)).toBe(0);
    expect(epochOf(31)).toBe(0);
    expect(epochOf(32)).toBe(1);
    expect(epochOf(449440 * SLOTS_PER_EPOCH)).toBe(449440);
  });

  it("epochSlotRange returns the inclusive slot bounds", () => {
    expect(epochSlotRange(1)).toEqual({ first: 32, last: 63 });
  });
});
