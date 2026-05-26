import { fetchRelayPayloads } from "./relay-payloads";
import {
  buildSnapshot,
  emptySnapshot,
  foldPayloadsBySlot,
  ledgerFromSnapshot,
} from "./snapshots";
import { createSnapshotStore, type SnapshotStore } from "./store";
import type { LedgerData, LiveLedgerSnapshot } from "./types";

export const MIN_SNAPSHOT_REFRESH_INTERVAL_MS = 15_000;

export async function readInitialLedger(
  store?: SnapshotStore,
): Promise<LedgerData> {
  const snapshotStore = store ?? (await createSnapshotStore());
  const snapshot = (await snapshotStore.readLatestSnapshot()) ?? emptySnapshot();
  return ledgerFromSnapshot(snapshot);
}

export async function refreshLiveLedger({
  store,
  now = Date.now(),
  fetchPayloads = fetchRelayPayloads,
}: {
  store?: SnapshotStore;
  now?: number;
  fetchPayloads?: typeof fetchRelayPayloads;
} = {}): Promise<{
  data: LedgerData;
  snapshot: LiveLedgerSnapshot;
  wroteSnapshot: boolean;
}> {
  const snapshotStore = store ?? (await createSnapshotStore());
  const previous = await snapshotStore.readLatestSnapshot();

  if (previous && isFreshSnapshot(previous, now)) {
    return {
      data: ledgerFromSnapshot(previous),
      snapshot: previous,
      wroteSnapshot: false,
    };
  }

  const result = await fetchPayloads();

  if (result.successfulRelays.length === 0) {
    const fallback = previous ?? emptySnapshot(now);
    return {
      data: ledgerFromSnapshot({
        ...fallback,
        degradedRelays:
          previous === null ? result.degradedRelays : fallback.degradedRelays,
      }),
      snapshot: fallback,
      wroteSnapshot: false,
    };
  }

  const snapshot = buildSnapshot({
    previous,
    incoming: foldPayloadsBySlot(result.payloads),
    degradedRelays: result.degradedRelays,
    now,
  });

  await snapshotStore.writeSnapshot(snapshot);
  await snapshotStore.cleanup();

  return {
    data: ledgerFromSnapshot(snapshot),
    snapshot,
    wroteSnapshot: true,
  };
}

function isFreshSnapshot(snapshot: LiveLedgerSnapshot, now: number): boolean {
  const fetchedAt = Date.parse(snapshot.fetchedAt);
  return Number.isFinite(fetchedAt)
    ? now - fetchedAt < MIN_SNAPSHOT_REFRESH_INTERVAL_MS
    : false;
}
