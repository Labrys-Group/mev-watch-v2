import { classifyRelay } from "@/config/relays";

import { currentSlot, epochOf, epochSlotRange } from "./chain-time";
import {
  LiveLedgerSnapshotSchema,
  type DegradedSlotRange,
  type LedgerData,
  type LiveLedgerSnapshot,
  type RelayPayload,
  type SlotCategory,
  type StoredRecentBlock,
} from "./types";

export const LIVE_LEDGER_SCHEMA_VERSION = 1;
export const LIVE_LEDGER_PRUNE_SLOTS = 256;
export const LIVE_LEDGER_EPOCH_ROWS = 4;

export function parseLiveLedgerSnapshot(value: unknown): LiveLedgerSnapshot {
  return LiveLedgerSnapshotSchema.parse(value);
}

export function emptySnapshot(now = Date.now()): LiveLedgerSnapshot {
  const fetchedAt = new Date(now).toISOString();
  return {
    schemaVersion: LIVE_LEDGER_SCHEMA_VERSION,
    headSlot: currentSlot(now),
    fetchedAt,
    degradedRelays: [],
    degradedSlotRanges: [],
    blocks: [],
  };
}

export function foldPayloadsBySlot(payloads: RelayPayload[]): StoredRecentBlock[] {
  const bySlot = new Map<number, StoredRecentBlock>();

  for (const payload of payloads) {
    const existing = bySlot.get(payload.slot);
    if (existing) {
      existing.relays = sortedUnique([...existing.relays, payload.relayId]);
      existing.builderPubkey ??= payload.builderPubkey;
      existing.valueWei ??= payload.valueWei;
      existing.numTx ??= payload.numTx;
      continue;
    }

    bySlot.set(payload.slot, {
      slot: payload.slot,
      blockNumber: payload.blockNumber,
      blockHash: payload.blockHash,
      builderPubkey: payload.builderPubkey,
      valueWei: payload.valueWei,
      numTx: payload.numTx,
      relays: [payload.relayId],
    });
  }

  return [...bySlot.values()]
    .map((block) => ({ ...block, relays: sortedUnique(block.relays) }))
    .sort((a, b) => a.slot - b.slot);
}

export function mergeSnapshotBlocks(
  existing: StoredRecentBlock[],
  incoming: StoredRecentBlock[],
): StoredRecentBlock[] {
  const bySlot = new Map<number, StoredRecentBlock>();

  for (const block of existing) {
    bySlot.set(block.slot, { ...block, relays: sortedUnique(block.relays) });
  }

  for (const block of incoming) {
    const current = bySlot.get(block.slot);
    if (!current) {
      bySlot.set(block.slot, { ...block, relays: sortedUnique(block.relays) });
      continue;
    }

    bySlot.set(block.slot, {
      ...current,
      blockNumber: block.blockNumber || current.blockNumber,
      blockHash: block.blockHash || current.blockHash,
      builderPubkey: block.builderPubkey ?? current.builderPubkey,
      valueWei: block.valueWei ?? current.valueWei,
      numTx: block.numTx ?? current.numTx,
      relays: sortedUnique([...current.relays, ...block.relays]),
    });
  }

  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

export function pruneSnapshotBlocks(
  blocks: StoredRecentBlock[],
  headSlot: number,
): StoredRecentBlock[] {
  const minimumSlot = headSlot - LIVE_LEDGER_PRUNE_SLOTS;
  return blocks.filter((block) => block.slot >= minimumSlot);
}

export function buildSnapshot({
  previous,
  incoming,
  degradedRelays,
  now = Date.now(),
}: {
  previous: LiveLedgerSnapshot | null;
  incoming: StoredRecentBlock[];
  degradedRelays: string[];
  now?: number;
}): LiveLedgerSnapshot {
  const headSlot = Math.max(
    currentSlot(now),
    previous?.headSlot ?? 0,
    incoming.at(-1)?.slot ?? 0,
  );
  const merged = mergeSnapshotBlocks(previous?.blocks ?? [], incoming);
  const degradedSlotRanges = buildDegradedSlotRanges({
    previous,
    degradedRelays,
    headSlot,
  });

  return {
    schemaVersion: LIVE_LEDGER_SCHEMA_VERSION,
    headSlot,
    fetchedAt: new Date(now).toISOString(),
    degradedRelays: [...degradedRelays].sort(),
    degradedSlotRanges,
    blocks: pruneSnapshotBlocks(merged, headSlot),
  };
}

export function isNewerSnapshot(
  incoming: LiveLedgerSnapshot,
  latest: LiveLedgerSnapshot,
): boolean {
  const incomingTime = Date.parse(incoming.fetchedAt);
  const latestTime = Date.parse(latest.fetchedAt);
  if (!Number.isFinite(incomingTime) || !Number.isFinite(latestTime)) {
    return incoming.headSlot > latest.headSlot;
  }
  if (incomingTime !== latestTime) return incomingTime > latestTime;
  return incoming.headSlot > latest.headSlot;
}

export function ledgerFromSnapshot(snapshot: LiveLedgerSnapshot): LedgerData {
  const currentEpoch = epochOf(snapshot.headSlot);
  const bySlot = new Map(snapshot.blocks.map((block) => [block.slot, block]));
  const degradedSlotRanges = effectiveDegradedSlotRanges(snapshot);
  const epochs = Array.from({ length: LIVE_LEDGER_EPOCH_ROWS }, (_, rowIndex) => {
    const epoch = currentEpoch - rowIndex;
    const range = epochSlotRange(epoch);

    return {
      epoch,
      inProgress: rowIndex === 0,
      slots: Array.from({ length: 32 }, (_, indexInEpoch) => {
        const slot = range.first + indexInEpoch;
        const block = bySlot.get(slot);
        const category: SlotCategory =
          slot > snapshot.headSlot
            ? "pending"
            : block
              ? classifySlot(block.relays)
              : isSlotInRanges(slot, degradedSlotRanges)
                ? "unknown"
                : "nonboost";

        return {
          slot,
          indexInEpoch,
          category,
          relays: block?.relays ?? [],
          builderPubkey: block?.builderPubkey,
          valueWei: block?.valueWei,
          blockNumber: block?.blockNumber,
          blockHash: block?.blockHash,
          numTx: block?.numTx,
        };
      }),
    };
  });

  return {
    headSlot: snapshot.headSlot,
    fetchedAt: snapshot.fetchedAt,
    degradedRelays: snapshot.degradedRelays,
    epochs,
  };
}

export function classifySlot(
  relays: string[],
): Exclude<SlotCategory, "pending" | "unknown"> {
  if (relays.length === 0) return "nonboost";
  return relays.some((relayId) => classifyRelay(relayId).posture === "censoring")
    ? "censoring"
    : "neutral";
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function buildDegradedSlotRanges({
  previous,
  degradedRelays,
  headSlot,
}: {
  previous: LiveLedgerSnapshot | null;
  degradedRelays: string[];
  headSlot: number;
}): DegradedSlotRange[] {
  const retainedFirstSlot = retainedFirstSlotFor(headSlot);
  const ranges = pruneDegradedSlotRanges(
    previous ? effectiveDegradedSlotRanges(previous) : [],
    headSlot,
  );

  if (degradedRelays.length > 0) {
    const firstSlot = previous
      ? previous.headSlot + 1
      : retainedFirstSlot;
    if (firstSlot <= headSlot) {
      ranges.push({ firstSlot, lastSlot: headSlot });
    }
  }

  return mergeDegradedSlotRanges(
    ranges.map((range) => ({
      firstSlot: Math.max(range.firstSlot, retainedFirstSlot),
      lastSlot: Math.min(range.lastSlot, headSlot),
    })),
  );
}

function pruneDegradedSlotRanges(
  ranges: DegradedSlotRange[],
  headSlot: number,
): DegradedSlotRange[] {
  const retainedFirstSlot = retainedFirstSlotFor(headSlot);
  return ranges
    .map((range) => ({
      firstSlot: Math.max(range.firstSlot, retainedFirstSlot),
      lastSlot: Math.min(range.lastSlot, headSlot),
    }))
    .filter((range) => range.firstSlot <= range.lastSlot);
}

function effectiveDegradedSlotRanges(
  snapshot: Pick<
    LiveLedgerSnapshot,
    "blocks" | "degradedRelays" | "degradedSlotRanges" | "headSlot"
  >,
): DegradedSlotRange[] {
  if (snapshot.degradedSlotRanges) return snapshot.degradedSlotRanges;
  if (snapshot.degradedRelays.length === 0) return [];
  const latestBlockSlot = snapshot.blocks.reduce<number | undefined>(
    (latest, block) =>
      latest === undefined ? block.slot : Math.max(latest, block.slot),
    undefined,
  );
  const firstSlot =
    latestBlockSlot === undefined
      ? retainedFirstSlotFor(snapshot.headSlot)
      : Math.max(retainedFirstSlotFor(snapshot.headSlot), latestBlockSlot + 1);
  if (firstSlot > snapshot.headSlot) return [];
  return [
    {
      firstSlot,
      lastSlot: snapshot.headSlot,
    },
  ];
}

function retainedFirstSlotFor(headSlot: number): number {
  return Math.max(0, headSlot - LIVE_LEDGER_PRUNE_SLOTS);
}

function mergeDegradedSlotRanges(
  ranges: DegradedSlotRange[],
): DegradedSlotRange[] {
  const sorted = ranges
    .filter((range) => range.firstSlot <= range.lastSlot)
    .sort((a, b) => a.firstSlot - b.firstSlot || a.lastSlot - b.lastSlot);
  const merged: DegradedSlotRange[] = [];

  for (const range of sorted) {
    const current = merged.at(-1);
    if (!current || range.firstSlot > current.lastSlot + 1) {
      merged.push({ ...range });
      continue;
    }
    current.lastSlot = Math.max(current.lastSlot, range.lastSlot);
  }

  return merged;
}

function isSlotInRanges(slot: number, ranges: DegradedSlotRange[]): boolean {
  return ranges.some(
    (range) => slot >= range.firstSlot && slot <= range.lastSlot,
  );
}
