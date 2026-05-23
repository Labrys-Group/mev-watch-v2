import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../db/schema";
import { createRecentBlocksStore, type StoredBlock } from "./recent-blocks-store";

function block(
  slot: number,
  relays: string[] = ["relay.ultrasound.money"],
): StoredBlock {
  return {
    slot,
    blockNumber: slot * 10,
    relays,
    builder: "0xbuilder",
    valueWei: "1000",
    numTx: 50,
  };
}

async function freshStore() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return createRecentBlocksStore(db);
}

describe("recentBlocksStore", () => {
  it("round-trips a block through upsert and read", async () => {
    const store = await freshStore();
    await store.upsertBlocks([block(1000, ["a", "b"])], 1000);
    const rows = await store.readWindow();
    expect(rows).toHaveLength(1);
    expect(rows[0].slot).toBe(1000);
    expect(rows[0].relays).toEqual(["a", "b"]);
  });

  it("upsert overwrites an existing slot", async () => {
    const store = await freshStore();
    await store.upsertBlocks([block(1000, ["a"])], 1000);
    await store.upsertBlocks([block(1000, ["a", "b"])], 1000);
    const rows = await store.readWindow();
    expect(rows).toHaveLength(1);
    expect(rows[0].relays).toEqual(["a", "b"]);
  });

  it("prunes slots older than head minus the window", async () => {
    const store = await freshStore();
    // head 2000, WINDOW_SLOTS 256 -> keep slot >= 1744
    await store.upsertBlocks([block(1743), block(1744), block(2000)], 2000);
    const slots = (await store.readWindow())
      .map((b) => b.slot)
      .sort((a, b) => a - b);
    expect(slots).toEqual([1744, 2000]);
  });
});
