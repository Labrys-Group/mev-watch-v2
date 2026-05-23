import { lt } from "drizzle-orm";
import { db as defaultDb } from "../db";
import { recentBlocks } from "../db/schema";

/** A delivered MEV-boost block held in the rolling window. */
export interface StoredBlock {
  slot: number;
  blockNumber: number;
  /** relayscan relay ids that delivered this slot's block. */
  relays: string[];
  builder: string;
  valueWei: string;
  numTx: number;
}

/** Slots kept behind the head before a row is pruned. 256 ≈ 1 hour. */
export const WINDOW_SLOTS = 256;

/** Reads and writes the recent-blocks window (real DB or a test fake). */
export interface RecentBlocksStore {
  readWindow(): Promise<StoredBlock[]>;
  upsertBlocks(blocks: StoredBlock[], head: number): Promise<void>;
}

type Db = typeof defaultDb;

/** Build a store bound to a given Drizzle database (production or test). */
export function createRecentBlocksStore(db: Db): RecentBlocksStore {
  return {
    async readWindow() {
      const rows = await db.select().from(recentBlocks);
      return rows.map((r) => ({
        slot: r.slot,
        blockNumber: r.blockNumber,
        relays: JSON.parse(r.relays) as string[],
        builder: r.builder,
        valueWei: r.valueWei,
        numTx: r.numTx,
      }));
    },

    async upsertBlocks(blocks, head) {
      const upserts = blocks.map((b) => {
        const values = {
          slot: b.slot,
          blockNumber: b.blockNumber,
          relays: JSON.stringify(b.relays),
          builder: b.builder,
          valueWei: b.valueWei,
          numTx: b.numTx,
        };
        return db
          .insert(recentBlocks)
          .values(values)
          .onConflictDoUpdate({ target: recentBlocks.slot, set: values });
      });
      const prune = db
        .delete(recentBlocks)
        .where(lt(recentBlocks.slot, head - WINDOW_SLOTS));
      // One libSQL batch round-trip: every upsert, then the prune. The cast
      // bridges drizzle's non-empty-tuple batch signature — the array is
      // always non-empty (prune is always present) and runtime-correct.
      await db.batch(
        [...upserts, prune] as unknown as Parameters<typeof db.batch>[0],
      );
    },
  };
}

/** The production store, bound to the app's Drizzle client. */
export const recentBlocksStore: RecentBlocksStore =
  createRecentBlocksStore(defaultDb);
