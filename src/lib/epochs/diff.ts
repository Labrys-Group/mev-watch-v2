import type { LedgerData } from "./get-live-epochs";

/** What changed between two ledger snapshots. */
export interface LedgerDiff {
  /** Slot numbers that gained a real category since the previous snapshot. */
  filledSlots: number[];
  /** How many epochs the in-progress epoch advanced (0 = none). */
  epochShift: number;
}

/** Compare two ledger snapshots. A null `prev` yields an empty diff. */
export function diffLedger(
  prev: LedgerData | null,
  next: LedgerData,
): LedgerDiff {
  if (!prev) return { filledSlots: [], epochShift: 0 };

  const epochShift = next.epochs[0].epoch - prev.epochs[0].epoch;

  const prevCategory = new Map<number, string>();
  for (const row of prev.epochs) {
    for (const cell of row.slots) prevCategory.set(cell.slot, cell.category);
  }

  const filledSlots: number[] = [];
  for (const row of next.epochs) {
    for (const cell of row.slots) {
      if (cell.category === "pending") continue;
      const before = prevCategory.get(cell.slot);
      if (before === undefined || before === "pending") {
        filledSlots.push(cell.slot);
      }
    }
  }
  return { filledSlots, epochShift };
}
