import { z } from "zod";

export type SlotCategory =
  | "censoring"
  | "neutral"
  | "nonboost"
  | "unknown"
  | "pending";

export interface RelayPayload {
  relayId: string;
  slot: number;
  blockNumber: number;
  blockHash: string;
  builderPubkey?: string;
  valueWei?: string;
  numTx?: number;
}

export interface StoredRecentBlock {
  slot: number;
  blockNumber: number;
  blockHash: string;
  relays: string[];
  builderPubkey?: string;
  valueWei?: string;
  numTx?: number;
}

export interface LiveLedgerSnapshot {
  schemaVersion: 1;
  headSlot: number;
  fetchedAt: string;
  degradedRelays: string[];
  blocks: StoredRecentBlock[];
}

export interface SlotCell {
  slot: number;
  indexInEpoch: number;
  category: SlotCategory;
  relays: string[];
  builderPubkey?: string;
  valueWei?: string;
  blockNumber?: number;
  blockHash?: string;
  numTx?: number;
}

export interface EpochRow {
  epoch: number;
  inProgress: boolean;
  slots: SlotCell[];
}

export interface LedgerData {
  headSlot: number;
  fetchedAt: string;
  degradedRelays: string[];
  epochs: EpochRow[];
}

export const StoredRecentBlockSchema = z.object({
  slot: z.number().int().nonnegative(),
  blockNumber: z.number().int().nonnegative(),
  blockHash: z.string(),
  relays: z.array(z.string()).default([]),
  builderPubkey: z.string().optional(),
  valueWei: z.string().optional(),
  numTx: z.number().int().nonnegative().optional(),
});

export const LiveLedgerSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  headSlot: z.number().int().nonnegative(),
  fetchedAt: z.string(),
  degradedRelays: z.array(z.string()),
  blocks: z.array(StoredRecentBlockSchema),
});
