import { currentSlot } from "./chain-time";
import { RELAYS } from "@/config/relays";
import type { DeliveredPayload, PayloadSource } from "./relay-payloads";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";

/** Relay-health summary from one ingest run. */
export interface IngestResult {
  relaysOk: number;
  relaysTotal: number;
  /**
   * Ids of relays whose API failed this run. Maintains the invariant
   * `failedRelays.length === relaysTotal - relaysOk`: when the source itself
   * throws, every configured relay is reported as failed (no per-relay info,
   * so the safe assumption is total failure) — never an empty list paired
   * with `relaysOk === 0`.
   */
  failedRelays: string[];
}

/** Fold per-relay delivered payloads into one StoredBlock per slot. */
export function foldPayloads(payloads: DeliveredPayload[]): StoredBlock[] {
  const bySlot = new Map<number, StoredBlock>();
  for (const p of payloads) {
    const existing = bySlot.get(p.slot);
    if (existing) {
      if (!existing.relays.includes(p.relayId)) existing.relays.push(p.relayId);
    } else {
      bySlot.set(p.slot, {
        slot: p.slot,
        blockNumber: p.blockNumber,
        relays: [p.relayId],
        builder: p.builderPubkey,
        valueWei: p.valueWei,
        numTx: p.numTx,
      });
    }
  }
  const blocks = [...bySlot.values()];
  for (const b of blocks) b.relays.sort();
  return blocks;
}

/**
 * Fetch recent deliveries from all relays and upsert them into the store.
 * Never throws — a total fetch failure leaves the store untouched and reports
 * zero healthy relays.
 */
export async function ingestRecentBlocks(
  source: PayloadSource,
  store: RecentBlocksStore,
  now: number = Date.now(),
): Promise<IngestResult> {
  try {
    const { payloads, okRelays, failedRelays } =
      await source.fetchRecentDeliveries();
    await store.upsertBlocks(foldPayloads(payloads), currentSlot(now));
    return {
      relaysOk: okRelays.length,
      relaysTotal: okRelays.length + failedRelays.length,
      failedRelays,
    };
  } catch {
    return {
      relaysOk: 0,
      relaysTotal: RELAYS.length,
      failedRelays: RELAYS.map((r) => r.id),
    };
  }
}
