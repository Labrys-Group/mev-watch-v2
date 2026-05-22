# Epoch Ledger — DB-Backed Live Blocks — Design

**Date:** 2026-05-22
**Status:** Approved, ready for implementation planning
**Topic:** Route the live epoch ledger's per-slot block data through the
`recent_blocks` table instead of fetching relay APIs directly from the request
path.
**Revises:** §3 and §11 of `2026-05-22-live-epoch-ledger-design.md`.

## 1. Context & problem

The live epoch ledger (`2026-05-22-live-epoch-ledger-design.md`, now implemented)
fetches the ~8 relay data APIs **directly from the `/api/epochs` request path**,
with a 15s Next.js fetch cache. That spec's §3 explicitly flagged this as "one
deliberate departure from the v1 rule 'pages read only snapshots, never the
external API'," and §11 deferred a persisted slots table as out of scope.

Two reasons to revisit:

1. **Consistency.** Every other section of the app reads DB snapshots; the epoch
   ledger is the lone part that reaches an external API from a route. Routing it
   through the DB removes the special case.
2. **The table already exists.** `recent_blocks` is defined in `schema.ts`
   ("Rolling window of the most recent blocks — drives the live block grid") but
   is completely unwired — vestigial from the pre-epoch-ledger block grid.

This design wires `recent_blocks` in as the source of truth for the ledger,
keeping the data as fresh as the serverless deployment allows.

## 2. Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Freshness vs. infrastructure | **~15s, Vercel-only.** On-demand ingestion inside the `/api/epochs` route; no worker, no extra cron. Works on the Hobby plan. |
| Block-data retention | **Live window only** — `recent_blocks` holds ~256 slots (~1 hour), pruned each ingest. Long-range history stays the trend chart's job. |
| Ingestion trigger | **Every function run.** No freshness-gate state: the CDN bounds run frequency, the fetch-cache bounds relay load, the upsert is idempotent. |
| Category storage | **Derived at read time** from the stored relay set — always reflects current `relays.ts`. |

## 3. Architecture — read-through cache

```
                  ┌─ CDN edge cache (s-maxage ~12s) ──────────┐
client poll 30s ─▶│  most polls served here, function idle    │
                  └─ on miss ─▶ /api/epochs function ─────────┘
                                     │ 1. ingest: fetch 8 relay APIs
                                     │    (Next fetch-cache 15s) → upsert
                                     │    recent_blocks → prune to ~256 slots
                                     │ 2. read recent_blocks
                                     │ 3. build 4-epoch ledger → return
homepage (SSR) ──▶ read recent_blocks (pure DB read, no relay fetch) ─▶ initial prop
```

Three caching layers, each with one responsibility:

- **Next.js fetch cache** (`revalidate: 15` on each relay call) — caps upstream
  relay load at ~8 calls / 15s regardless of traffic.
- **CDN `s-maxage`** on the route response — absorbs client polling at the edge;
  the route function runs only ~once per cache window.
- **`recent_blocks` table** — the persistent rolling window; the single source
  of truth the response is built from.

The homepage server render becomes a pure DB read (no relay fan-out), which
removes the external-API departure the prior spec flagged. Ingestion is fully
demand-driven: with no visitor polling, nothing runs — there is no idle cost.

## 4. Data layer — `recent_blocks` reshaped

The existing table (single `relay_key`, no builder / value / tx columns) cannot
represent a slot delivered by multiple relays, nor the tooltip detail. It holds
no data, so it is reshaped via a normal Drizzle migration:

```ts
recentBlocks = sqliteTable("recent_blocks", {
  slot: integer("slot").primaryKey(),
  blockNumber: integer("block_number").notNull(),
  relays: text("relays").notNull(),          // JSON array of relayscan relay ids
  builder: text("builder").notNull(),        // builder pubkey
  valueWei: text("value_wei").notNull(),
  numTx: integer("num_tx").notNull(),
  ingestedAt: integer("ingested_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

- **Only delivered MEV-boost blocks are stored.** A slot absent from the table
  is `nonboost` (locally built or missed); a slot beyond the current head is
  `pending`. `getLiveEpochs` reconstructs all 128 ledger cells from
  presence/absence plus chain time.
- **Category is not stored.** `censoring`/`neutral` is derived per read via
  `classifySlot` over the stored `relays`, so a `relays.ts` posture change is
  reflected immediately without re-ingesting.
- **Rolling window.** After each upsert, rows with `slot < head - 256` are
  deleted.

## 5. Modules — `src/lib/epochs/`

### `recent-blocks-store.ts` (new)
The only module that touches the `recent_blocks` table.
- `readWindow(): Promise<StoredBlock[]>` — the current rolling window.
- `upsertBlocks(blocks: StoredBlock[], head: number): Promise<void>` — upsert by
  `slot` (idempotent), then prune rows with `slot < head - 256`.

`StoredBlock` is `{ slot, blockNumber, relays: string[], builder, valueWei,
numTx }`; the store serialises `relays` to/from the JSON text column.

### `ingest.ts` (new)
- `ingestRecentBlocks(source: PayloadSource, store): Promise<void>` — fetch
  recent deliveries from all relays via the existing `RelayPayloadSource`, fold
  multi-relay slots into one `StoredBlock` each, then `upsertBlocks`. `source`
  and `store` are injectable for tests.

### `get-live-epochs.ts` (modified)
Loses all relay knowledge. New shape: `getLiveEpochs(store, now?):
Promise<LedgerData>` — read the window, bucket by slot, classify each of the 128
cells, assemble 4 `EpochRow`s. Pure DB → ledger. The returned `LedgerData`
shape, `EpochRow`, and `SlotCell` are unchanged, so the UI is untouched.

### `relay-payloads.ts`, `classify.ts`, `chain-time.ts`
Unchanged. `RelayPayloadSource` is now called by `ingest.ts` rather than
`get-live-epochs.ts`.

## 6. API route — `src/app/api/epochs/route.ts`

```
GET /api/epochs:
  await ingestRecentBlocks(new RelayPayloadSource(), store)
  data = await getLiveEpochs(store)
  return JSON  ·  Cache-Control: public, s-maxage=12, stale-while-revalidate=24
```

`s-maxage=12` ≈ one slot — pollers within the window are served from the CDN
without invoking the function. The route stays public and unguarded (read-only
data, consistent with `/api/v1/*`).

## 7. Homepage — `composition.tsx`

The server component calls `getLiveEpochs(store)` — a pure DB read: fast, no
relay dependency. It does **not** ingest; the client poll keeps data fresh
within 30s of any visitor arriving. A cold DB (no recent visitors) simply shows
the last stored window until the first poll refreshes it.

## 8. Error handling

| Situation | Behaviour |
|---|---|
| One relay down/slow | Skipped after timeout (existing `RelayPayloadSource` behaviour); ingest upserts whatever succeeded. |
| All relays fail | No upsert; the route still serves the last-good `recent_blocks`. The ledger degrades, never blanks. |
| Empty DB (first ever request) | Ingest populates it; until the first successful ingest the ledger renders pending/nonboost. |
| Concurrent ingests (multi-region / SWR) | Harmless — `upsertBlocks` is idempotent; the relay fetch-cache prevents duplicate upstream load. |

## 9. Testing

- `recent-blocks-store.test.ts` — upsert idempotency, the prune boundary,
  against a test DB.
- `ingest.test.ts` — with a fake `PayloadSource`: multi-relay folding, upsert
  called with the right rows.
- `get-live-epochs.test.ts` — adjusted: feeds a store fake instead of a payload
  fake; epoch assembly and the pending/nonboost slot boundaries.
- Route — integration: ingest-then-read produces a coherent `LedgerData`.
- e2e — unchanged: the homepage renders 4 epoch rows, one in-progress.

## 10. Migration & rollout

1. Reshape `recent_blocks` in `schema.ts`; `pnpm db:generate` produces a
   migration; `pnpm db:migrate` applies it (local file and Turso).
2. Purely additive to the daily pipeline — `src/lib/refresh/`, the snapshot
   tables, and `/api/refresh` are untouched.
3. No new env vars, no new cron job.

## 11. Out of scope

- Longer block history or a public `/api/v1/epochs` endpoint — the trend chart
  covers long-range history.
- A dedicated ingestion worker for true per-slot (12s) freshness — revisit only
  if ~15s proves insufficient.
- Splitting missed slots from locally-built blocks (needs a beacon API) —
  remains deferred, as in the original spec.

## 12. Build sequence

1. Reshape `recent_blocks` in `schema.ts`; generate and apply the migration.
2. `recent-blocks-store.ts` + tests.
3. `ingest.ts` + tests.
4. Refactor `get-live-epochs.ts` to read the store; update its tests.
5. Update `/api/epochs/route.ts` to ingest-then-read.
6. Confirm `composition.tsx` SSR reads via the store.
7. Revise `2026-05-22-live-epoch-ledger-design.md` §3 and §11 to point here.
8. e2e + manual verification.
