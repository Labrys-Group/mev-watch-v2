import {
  currentSlot,
  epochOf,
  epochSlotRange,
  SLOTS_PER_EPOCH,
} from "./chain-time";
import { classifySlot, type SlotCategory } from "./classify";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";
import { RELAYS } from "@/config/relays";

/** Number of epoch rows the ledger shows (in-progress + 3 completed). */
export const EPOCH_ROWS = 4;

/**
 * How many of the most-recent slots stay `pending` when no relay row has
 * arrived yet, rather than flipping to `nonboost`. Covers worst-case
 * relay-publish lag plus the 15s relay fetch-cache and 20s CDN cache —
 * at 12s/slot, 3 slots (36s) is a safe revalidation window so we don't
 * mislabel a just-landed block as non-MEV-boost before its relay reports.
 */
export const NONBOOST_GRACE_SLOTS = 3;

/** One slot tile's data. `category` "pending" means the slot has not happened. */
export interface SlotCell {
  slot: number;
  indexInEpoch: number;
  category: SlotCategory | "pending";
  relays: string[];
  builder: string | null;
  valueWei: string | null;
  blockNumber: number | null;
  numTx: number | null;
}

/** One epoch row — 32 slot cells. */
export interface EpochRow {
  epoch: number;
  inProgress: boolean;
  slots: SlotCell[];
}

/** The full ledger payload returned to the UI and the API route. */
export interface LedgerData {
  epochs: EpochRow[]; // newest (in-progress) first
  headSlot: number;
  fetchedAt: number;
  relaysOk: number;
  relaysTotal: number;
}

/**
 * Build the latest EPOCH_ROWS epochs, newest first, from the stored recent
 * blocks. Pure DB → ledger: no relay APIs are touched. Never throws — a store
 * read failure yields rows of nonboost/pending slots.
 *
 * `relaysOk`/`relaysTotal` default to "all healthy"; the /api/epochs route
 * overrides them with the real ingest result. The homepage snapshot keeps the
 * optimistic default until the first client poll.
 */
export async function getLiveEpochs(
  store: RecentBlocksStore,
  now: number = Date.now(),
): Promise<LedgerData> {
  const head = currentSlot(now);
  const headEpoch = epochOf(head);

  let blocks: StoredBlock[] = [];
  try {
    blocks = await store.readWindow();
  } catch {
    blocks = [];
  }

  const bySlot = new Map<number, StoredBlock>();
  for (const b of blocks) bySlot.set(b.slot, b);

  const epochs: EpochRow[] = [];
  for (let e = 0; e < EPOCH_ROWS; e++) {
    const epoch = headEpoch - e;
    const inProgress = e === 0;
    const { first } = epochSlotRange(epoch);
    const slots: SlotCell[] = [];

    for (let i = 0; i < SLOTS_PER_EPOCH; i++) {
      const slot = first + i;
      const block = bySlot.get(slot);
      let category: SlotCell["category"];
      if (slot > head) category = "pending";
      else if (block) category = classifySlot(block.relays);
      else if (slot > head - NONBOOST_GRACE_SLOTS) category = "pending";
      else category = "nonboost";
      slots.push({
        slot,
        indexInEpoch: i,
        category,
        relays: block?.relays ?? [],
        builder: block?.builder ?? null,
        valueWei: block?.valueWei ?? null,
        blockNumber: block?.blockNumber ?? null,
        numTx: block?.numTx ?? null,
      });
    }
    epochs.push({ epoch, inProgress, slots });
  }

  return {
    epochs,
    headSlot: head,
    fetchedAt: now,
    relaysOk: RELAYS.length,
    relaysTotal: RELAYS.length,
  };
}
