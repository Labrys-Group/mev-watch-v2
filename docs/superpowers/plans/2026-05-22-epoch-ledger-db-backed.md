# DB-Backed Epoch Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the live epoch ledger's per-slot block data through the `recent_blocks` table — ingestion writes it, the API route and homepage read it — instead of fetching relay APIs directly from the request path.

**Architecture:** A read-through cache. The `/api/epochs` route ingests (fetch relays → upsert `recent_blocks` → prune to a ~256-slot window) then reads the table to build the ledger. A CDN `s-maxage` header absorbs client polling; the homepage server-render becomes a pure DB read. Three caching layers: Next.js fetch-cache (relay load), CDN (poll traffic), `recent_blocks` (source of truth).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, libSQL/Turso, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-22-epoch-ledger-db-backed-design.md`

---

## File structure

**Modified:**
- `src/lib/db/schema.ts` — reshape the `recentBlocks` table.
- `src/lib/epochs/get-live-epochs.ts` — read from a store instead of a `PayloadSource`.
- `src/lib/epochs/get-live-epochs.test.ts` — drive with a store fake.
- `src/app/api/epochs/route.ts` — ingest, then read.
- `src/components/sections/composition.tsx` — server-render from the store.
- `docs/superpowers/specs/2026-05-22-live-epoch-ledger-design.md` — revise §3 and §11.

**Created:**
- `drizzle/<generated>.sql` — the `recent_blocks` reshape migration.
- `src/lib/epochs/recent-blocks-store.ts` — the only module that touches the table.
- `src/lib/epochs/recent-blocks-store.test.ts`
- `src/lib/epochs/ingest.ts` — fetch relays → fold → upsert.
- `src/lib/epochs/ingest.test.ts`

**Unchanged (depended on):** `src/lib/epochs/relay-payloads.ts` (`RelayPayloadSource`, `PayloadSource`, `DeliveredPayload`), `src/lib/epochs/classify.ts` (`classifySlot`), `src/lib/epochs/chain-time.ts`.

---

## Task 1: Reshape the `recent_blocks` table

**Files:**
- Modify: `src/lib/db/schema.ts:36-42`
- Create: `drizzle/<generated>.sql` (via `pnpm db:generate`)

- [ ] **Step 1: Replace the `recentBlocks` table definition**

In `src/lib/db/schema.ts`, replace the existing `recentBlocks` block (currently `slot`, `block_number`, `relay_key`, `category`, `ts`) with:

```ts
/** Rolling window of recent delivered MEV-boost blocks — feeds the epoch ledger. */
export const recentBlocks = sqliteTable("recent_blocks", {
  slot: integer("slot").primaryKey(),
  blockNumber: integer("block_number").notNull(),
  relays: text("relays").notNull(), // JSON array of relayscan relay ids
  builder: text("builder").notNull(),
  valueWei: text("value_wei").notNull(),
  numTx: integer("num_tx").notNull(),
  ingestedAt: integer("ingested_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file under `drizzle/` reshaping `recent_blocks`.
Note: `recent_blocks` holds no data (it was vestigial), so the reshape is safe. If `drizzle-kit` prompts "Is column X renamed?", answer **No / create column** for every prompt — these are new columns, not renames.

- [ ] **Step 3: Apply the migration**

Run: `pnpm db:migrate`
Expected: `migrations applied successfully!`. This targets whatever `.env` `DATABASE_URL` points at; reshaping the empty `recent_blocks` table is safe on any target.

- [ ] **Step 4: Verify the new shape**

Run: `pnpm db:check`
Expected: `DATABASE CONNECTION OK`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: reshape recent_blocks table for the epoch ledger"
```

---

## Task 2: `recent-blocks-store.ts` — the table access layer

**Files:**
- Create: `src/lib/epochs/recent-blocks-store.ts`
- Test: `src/lib/epochs/recent-blocks-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/recent-blocks-store.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../db/schema";
import { createRecentBlocksStore, type StoredBlock } from "./recent-blocks-store";

function block(slot: number, relays: string[] = ["relay.ultrasound.money"]): StoredBlock {
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
    // head 2000, WINDOW_SLOTS 256 → keep slot >= 1744
    await store.upsertBlocks([block(1743), block(1744), block(2000)], 2000);
    const slots = (await store.readWindow())
      .map((b) => b.slot)
      .sort((a, b) => a - b);
    expect(slots).toEqual([1744, 2000]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/recent-blocks-store.test.ts`
Expected: FAIL — `recent-blocks-store.ts` does not exist yet.

- [ ] **Step 3: Write the store module**

Create `src/lib/epochs/recent-blocks-store.ts`:

```ts
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
      // One libSQL batch round-trip for every upsert plus the prune.
      const statements = [...upserts, prune];
      await db.batch(statements as Parameters<typeof db.batch>[0]);
    },
  };
}

/** The production store, bound to the app's Drizzle client. */
export const recentBlocksStore: RecentBlocksStore =
  createRecentBlocksStore(defaultDb);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/recent-blocks-store.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/recent-blocks-store.ts src/lib/epochs/recent-blocks-store.test.ts
git commit -m "feat: add recent-blocks store for the epoch ledger"
```

---

## Task 3: `ingest.ts` — fetch, fold, upsert

**Files:**
- Create: `src/lib/epochs/ingest.ts`
- Test: `src/lib/epochs/ingest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/ingest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { foldPayloads, ingestRecentBlocks } from "./ingest";
import type { DeliveredPayload, PayloadSource } from "./relay-payloads";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";

function payload(slot: number, relayId: string): DeliveredPayload {
  return {
    slot,
    blockHash: "0xblk",
    builderPubkey: "0xbuilder",
    valueWei: "1000",
    numTx: 10,
    blockNumber: slot,
    relayId,
  };
}

function fakeStore() {
  const upserted: { blocks: StoredBlock[]; head: number }[] = [];
  const store: RecentBlocksStore = {
    readWindow: async () => [],
    upsertBlocks: async (blocks, head) => {
      upserted.push({ blocks, head });
    },
  };
  return { store, upserted };
}

describe("foldPayloads", () => {
  it("merges relays that delivered the same slot into one block", () => {
    const folded = foldPayloads([
      payload(100, "boost-relay.flashbots.net"),
      payload(100, "relay.ultrasound.money"),
    ]);
    expect(folded).toHaveLength(1);
    expect(folded[0].slot).toBe(100);
    expect(folded[0].relays).toEqual(
      ["boost-relay.flashbots.net", "relay.ultrasound.money"].sort(),
    );
  });

  it("keeps distinct slots separate", () => {
    const folded = foldPayloads([
      payload(100, "relay.ultrasound.money"),
      payload(101, "relay.ultrasound.money"),
    ]);
    expect(folded.map((b) => b.slot).sort((a, b) => a - b)).toEqual([100, 101]);
  });
});

describe("ingestRecentBlocks", () => {
  it("folds fetched payloads and upserts them", async () => {
    const { store, upserted } = fakeStore();
    const source: PayloadSource = {
      fetchRecentDeliveries: async () => ({
        payloads: [payload(100, "boost-relay.flashbots.net")],
        okRelays: ["boost-relay.flashbots.net"],
        failedRelays: [],
      }),
    };
    const result = await ingestRecentBlocks(source, store);
    expect(upserted).toHaveLength(1);
    expect(upserted[0].blocks[0].slot).toBe(100);
    expect(result.relaysOk).toBe(1);
    expect(result.relaysTotal).toBe(1);
  });

  it("returns relaysOk 0 and leaves the store untouched when the source throws", async () => {
    const { store, upserted } = fakeStore();
    const source: PayloadSource = {
      fetchRecentDeliveries: async () => {
        throw new Error("network down");
      },
    };
    const result = await ingestRecentBlocks(source, store);
    expect(result.relaysOk).toBe(0);
    expect(result.relaysTotal).toBeGreaterThan(0);
    expect(upserted).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/ingest.test.ts`
Expected: FAIL — `ingest.ts` does not exist yet.

- [ ] **Step 3: Write the ingest module**

Create `src/lib/epochs/ingest.ts`:

```ts
import { currentSlot } from "./chain-time";
import { RELAYS } from "@/config/relays";
import type { DeliveredPayload, PayloadSource } from "./relay-payloads";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";

/** Relay-health counts from one ingest run. */
export interface IngestResult {
  relaysOk: number;
  relaysTotal: number;
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
    };
  } catch {
    return { relaysOk: 0, relaysTotal: RELAYS.length };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/ingest.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/ingest.ts src/lib/epochs/ingest.test.ts
git commit -m "feat: add recent-blocks ingestion from relay APIs"
```

---

## Task 4: Refactor `get-live-epochs.ts` to read the store

**Files:**
- Modify: `src/lib/epochs/get-live-epochs.ts` (full rewrite)
- Test: `src/lib/epochs/get-live-epochs.test.ts` (full rewrite)

- [ ] **Step 1: Rewrite the test to drive `getLiveEpochs` with a store**

Replace the entire contents of `src/lib/epochs/get-live-epochs.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { getLiveEpochs } from "./get-live-epochs";
import { GENESIS_TIME, SLOTS_PER_EPOCH } from "./chain-time";
import type { RecentBlocksStore, StoredBlock } from "./recent-blocks-store";

const EPOCH = 1000;
const HEAD_SLOT = EPOCH * SLOTS_PER_EPOCH + 10; // slot index 10 of epoch 1000
const NOW = (GENESIS_TIME + HEAD_SLOT * 12) * 1000;

function store(blocks: StoredBlock[]): RecentBlocksStore {
  return {
    readWindow: async () => blocks,
    upsertBlocks: async () => {},
  };
}

function block(slot: number, relays: string[]): StoredBlock {
  return {
    slot,
    blockNumber: 1,
    relays,
    builder: "0xbuilder",
    valueWei: "1000",
    numTx: 100,
  };
}

describe("getLiveEpochs", () => {
  it("returns four rows, newest first, in-progress at the top", async () => {
    const data = await getLiveEpochs(store([]), NOW);
    expect(data.epochs).toHaveLength(4);
    expect(data.epochs[0].epoch).toBe(EPOCH);
    expect(data.epochs[0].inProgress).toBe(true);
    expect(data.epochs[3].epoch).toBe(EPOCH - 3);
    expect(data.epochs[3].inProgress).toBe(false);
  });

  it("marks not-yet-happened slots of the in-progress epoch as pending", async () => {
    const data = await getLiveEpochs(store([]), NOW);
    const top = data.epochs[0];
    expect(top.slots[10].category).not.toBe("pending"); // == head, happened
    expect(top.slots[11].category).toBe("pending"); // > head
    expect(top.slots[31].category).toBe("pending");
  });

  it("classifies a slot censoring when a censoring relay delivered it", async () => {
    const slot = (EPOCH - 1) * SLOTS_PER_EPOCH + 5;
    const data = await getLiveEpochs(
      store([block(slot, ["boost-relay.flashbots.net"])]),
      NOW,
    );
    const cell = data.epochs[1].slots[5];
    expect(cell.category).toBe("censoring");
    expect(cell.relays).toContain("boost-relay.flashbots.net");
  });

  it("classifies an undelivered past slot as nonboost", async () => {
    const data = await getLiveEpochs(store([]), NOW);
    expect(data.epochs[1].slots[0].category).toBe("nonboost");
  });

  it("returns four rows without throwing when the store read fails", async () => {
    const broken: RecentBlocksStore = {
      readWindow: async () => {
        throw new Error("db down");
      },
      upsertBlocks: async () => {},
    };
    const data = await getLiveEpochs(broken, NOW);
    expect(data.epochs).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/get-live-epochs.test.ts`
Expected: FAIL — `getLiveEpochs` still expects a `PayloadSource`; passing a store produces type/runtime mismatches.

- [ ] **Step 3: Rewrite `get-live-epochs.ts`**

Replace the entire contents of `src/lib/epochs/get-live-epochs.ts` with:

```ts
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
      const category: SlotCell["category"] =
        slot > head
          ? "pending"
          : block
            ? classifySlot(block.relays)
            : "nonboost";
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/get-live-epochs.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/get-live-epochs.ts src/lib/epochs/get-live-epochs.test.ts
git commit -m "refactor: build the epoch ledger from the recent-blocks store"
```

---

## Task 5: Wire the route and the homepage

The `/api/epochs` route and `composition.tsx` are thin composition of the units
tested in Tasks 2–4. They carry no branching logic, so they are verified by the
TypeScript compiler (`pnpm build`) here and by the e2e run in Task 6 — rather
than by isolated unit tests that would need a live DB and live `fetch`.

**Files:**
- Modify: `src/app/api/epochs/route.ts` (full rewrite)
- Modify: `src/components/sections/composition.tsx:5-18`

- [ ] **Step 1: Rewrite the API route**

Replace the entire contents of `src/app/api/epochs/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";
import { ingestRecentBlocks } from "@/lib/epochs/ingest";
import { RelayPayloadSource } from "@/lib/epochs/relay-payloads";
import { recentBlocksStore } from "@/lib/epochs/recent-blocks-store";

export const runtime = "nodejs";
// The handler always runs; freshness is bounded by the s-maxage CDN cache
// below and the 15s relay fetch-cache inside RelayPayloadSource.
export const dynamic = "force-dynamic";

export async function GET() {
  const { relaysOk, relaysTotal } = await ingestRecentBlocks(
    new RelayPayloadSource(),
    recentBlocksStore,
  );
  const data = await getLiveEpochs(recentBlocksStore);

  return NextResponse.json(
    { ...data, relaysOk, relaysTotal },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, s-maxage=12, stale-while-revalidate=24",
      },
    },
  );
}
```

- [ ] **Step 2: Update the homepage composition section**

In `src/components/sections/composition.tsx`, replace the `RelayPayloadSource`
import (line 7) with the store import, and replace the `ledger` line and its
comment (lines 14-18). The import lines become:

```ts
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";
import { recentBlocksStore } from "@/lib/epochs/recent-blocks-store";
```

And inside `Composition`, the ledger fetch becomes:

```ts
  // Server-render the initial ledger straight from the recent_blocks table —
  // a fast DB read, no relay fan-out. The client EpochLedger polls
  // /api/epochs every 30s, which refreshes the table and the live data.
  const ledger = await getLiveEpochs(recentBlocksStore);
```

- [ ] **Step 3: Typecheck and run the full unit suite**

Run: `pnpm build`
Expected: build succeeds — no type errors in `route.ts` or `composition.tsx`.

Run: `pnpm test`
Expected: PASS — the full suite stays green (`relay-payloads.test.ts` is unaffected; `RelayPayloadSource` is unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/epochs/route.ts src/components/sections/composition.tsx
git commit -m "feat: serve the epoch ledger from the DB via a read-through route"
```

---

## Task 6: Revise the prior spec and run full verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-22-live-epoch-ledger-design.md` (§3, §11)

- [ ] **Step 1: Revise §3 of the original epoch-ledger spec**

In `docs/superpowers/specs/2026-05-22-live-epoch-ledger-design.md`, append this
note to the end of section "3. Architecture overview":

```markdown
> **Revised 2026-05-22:** This subsystem is now DB-backed. The `recent_blocks`
> table is the source of truth; the `/api/epochs` route ingests into it and
> reads from it, and the homepage server-render is a pure DB read. The
> "departure from the v1 rule" described above no longer applies. See
> `2026-05-22-epoch-ledger-db-backed-design.md`.
```

- [ ] **Step 2: Revise §11 of the original epoch-ledger spec**

In the same file, in section "11. Out of scope / future", replace the first
bullet ("A persisted `slots` table and a public `/api/v1/epochs` endpoint ...")
with:

```markdown
- A persisted slots table is now **in scope and implemented** as `recent_blocks`
  — see `2026-05-22-epoch-ledger-db-backed-design.md`. A public `/api/v1/epochs`
  endpoint remains out of scope.
```

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm test`
Expected: PASS — all unit tests green.

- [ ] **Step 4: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: PASS — the homepage renders the epoch ledger (4 rows, one in-progress). The `LedgerData`/`SlotCell`/`EpochRow` shapes are unchanged, so the UI and its e2e are unaffected. If the e2e fails because the local DB's `recent_blocks` is empty, run `curl -s localhost:3000/api/epochs > /dev/null` once (or load the homepage) to trigger an ingest, then re-run.

- [ ] **Step 5: Production build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-05-22-live-epoch-ledger-design.md
git commit -m "docs: mark the epoch ledger DB-backed in the original spec"
```

---

## Notes for the executor

- **Branch:** work on `dev` (the active v2 branch) — confirmed with the user.
- **`.env`:** currently points at the Turso staging DB. Task 1's `pnpm db:migrate`
  reshapes the empty `recent_blocks` table there, which is required for the
  deployed app. The Task 2 store tests use in-memory DBs and are independent of
  `.env`.
- **Pre-existing `tsc` noise:** `queries.test.ts` and `slack.test.ts` have
  type errors that predate this work — they are not caused by these tasks and
  are out of scope here.
