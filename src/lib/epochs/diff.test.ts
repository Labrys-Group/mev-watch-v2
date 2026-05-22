import { describe, it, expect } from "vitest";
import { diffLedger } from "./diff";
import type { LedgerData } from "./get-live-epochs";

function ledger(topEpoch: number, fillTopUpTo: number): LedgerData {
  const epochs = [0, 1, 2, 3].map((e) => {
    const epoch = topEpoch - e;
    const inProgress = e === 0;
    const slots = Array.from({ length: 32 }, (_, i) => ({
      slot: epoch * 32 + i,
      indexInEpoch: i,
      category:
        inProgress && i > fillTopUpTo
          ? ("pending" as const)
          : ("neutral" as const),
      relays: [] as string[],
      builder: null,
      valueWei: null,
      blockNumber: null,
      numTx: null,
    }));
    return { epoch, inProgress, slots };
  });
  return { epochs, headSlot: 0, fetchedAt: 0, relaysOk: 8, relaysTotal: 8 };
}

describe("diffLedger", () => {
  it("reports nothing when there is no previous data", () => {
    expect(diffLedger(null, ledger(100, 10))).toEqual({
      filledSlots: [],
      epochShift: 0,
    });
  });

  it("lists slots that turned from pending to a real category", () => {
    const d = diffLedger(ledger(100, 10), ledger(100, 13));
    expect(d.filledSlots).toEqual([100 * 32 + 11, 100 * 32 + 12, 100 * 32 + 13]);
    expect(d.epochShift).toBe(0);
  });

  it("reports the epoch delta when the in-progress epoch advances", () => {
    expect(diffLedger(ledger(100, 31), ledger(101, 2)).epochShift).toBe(1);
    expect(diffLedger(ledger(100, 31), ledger(109, 2)).epochShift).toBe(9);
  });
});
