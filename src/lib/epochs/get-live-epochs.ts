import { currentSlot, epochOf, epochSlotRange, SLOTS_PER_EPOCH } from "./chain-time";
import { classifySlot, type SlotCategory } from "./classify";
import { RelayPayloadSource, type DeliveredPayload, type PayloadSource } from "./relay-payloads";
import { RELAYS } from "@/config/relays";

/** Number of epoch rows the ledger shows (in-progress + 3 completed). */
export const EPOCH_ROWS = 4;

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
 * Fetch + classify the latest EPOCH_ROWS epochs, newest first. Never throws —
 * on a total fetch failure it returns rows of nonboost/pending slots and
 * `relaysOk: 0` so the client can show a "reconnecting" state.
 */
export async function getLiveEpochs(
  source: PayloadSource = new RelayPayloadSource(),
  now: number = Date.now(),
): Promise<LedgerData> {
  const head = currentSlot(now);
  const headEpoch = epochOf(head);

  let payloads: DeliveredPayload[] = [];
  let okRelays: string[] = [];
  let failedRelays: string[] = [];
  try {
    const result = await source.fetchRecentDeliveries();
    payloads = result.payloads;
    okRelays = result.okRelays;
    failedRelays = result.failedRelays;
  } catch {
    // Total fetch failure: mark every relay failed so relaysTotal stays honest
    // (relaysOk is 0); every slot then falls through to nonboost/pending.
    failedRelays = RELAYS.map((r) => r.id);
  }

  const bySlot = new Map<number, DeliveredPayload[]>();
  for (const p of payloads) {
    const list = bySlot.get(p.slot);
    if (list) list.push(p);
    else bySlot.set(p.slot, [p]);
  }

  const epochs: EpochRow[] = [];
  for (let e = 0; e < EPOCH_ROWS; e++) {
    const epoch = headEpoch - e;
    const inProgress = e === 0;
    const { first } = epochSlotRange(epoch);
    const slots: SlotCell[] = [];

    for (let i = 0; i < SLOTS_PER_EPOCH; i++) {
      const slot = first + i;
      const delivered = bySlot.get(slot) ?? [];
      const category: SlotCell["category"] =
        slot > head
          ? "pending"
          : classifySlot(delivered.map((d) => d.relayId));
      const best = delivered[0] ?? null;
      slots.push({
        slot,
        indexInEpoch: i,
        category,
        relays: delivered.map((d) => d.relayId),
        builder: best?.builderPubkey ?? null,
        valueWei: best?.valueWei ?? null,
        blockNumber: best?.blockNumber ?? null,
        numTx: best?.numTx ?? null,
      });
    }
    epochs.push({ epoch, inProgress, slots });
  }

  return {
    epochs,
    headSlot: head,
    fetchedAt: now,
    relaysOk: okRelays.length,
    relaysTotal: okRelays.length + failedRelays.length,
  };
}
