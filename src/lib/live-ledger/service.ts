import { fetchRelayPayloads } from "./relay-payloads";
import {
  buildSnapshot,
  emptySnapshot,
  foldPayloadsBySlot,
  isNewerSnapshot,
  ledgerFromSnapshot,
} from "./snapshots";
import { createSnapshotStore, type SnapshotStore } from "./store";
import { LIVE_LEDGER_REFRESH_INTERVAL_MS } from "./timing";
import type { LedgerData, LiveLedgerSnapshot } from "./types";

export const MIN_SNAPSHOT_REFRESH_INTERVAL_MS = LIVE_LEDGER_REFRESH_INTERVAL_MS;

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
  let previous = await snapshotStore.readLatestSnapshot();

  if (!previous || !isFreshSnapshot(previous, now)) {
    const archived = await snapshotStore.readNewestArchivedSnapshot();
    if (archived && (!previous || isNewerSnapshot(archived, previous))) {
      previous = archived;
    }
  }

  if (previous && isFreshSnapshot(previous, now)) {
    return {
      data: ledgerFromSnapshot(previous),
      snapshot: previous,
      wroteSnapshot: false,
    };
  }

  const result = await fetchPayloads();

  if (result.successfulRelays.length === 0) {
    const snapshot = buildSnapshot({
      previous,
      incoming: [],
      degradedRelays: result.degradedRelays,
      now,
    });
    await snapshotStore.writeSnapshot(snapshot);
    return {
      data: ledgerFromSnapshot(snapshot),
      snapshot,
      wroteSnapshot: true,
    };
  }

  const snapshot = buildSnapshot({
    previous,
    incoming: foldPayloadsBySlot(result.payloads),
    degradedRelays: result.degradedRelays,
    now,
  });

  await snapshotStore.writeSnapshot(snapshot);

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
