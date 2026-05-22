# Live Epoch Ledger — Design

**Date:** 2026-05-22
**Status:** Approved, ready for implementation planning
**Topic:** Replace the homepage block-composition waffle grid with a live, per-slot epoch ledger.

## 1. Context & problem

The homepage `Composition` section currently renders `BlockGrid`
(`src/components/sections/block-grid.tsx`): a 128-tile waffle chart, 16 columns ×
8 rows of square tiles. Two problems:

1. **It is too tall.** At desktop width the grid is ~540px — a lot of vertical
   space for what is essentially one number (the censorship %).
2. **It is not real data.** The tiles are a proportional fill — the first
   `round(censorshipPct/100 × 128)` tiles are coloured censoring, then neutral,
   then non-boost. The footnote already concedes this ("Each tile ≈ 1/128 of the
   latest day's blocks"). For a transparency tool, an illustrative grid is weaker
   than real per-slot data.

This design replaces it with an **epoch ledger**: real Ethereum slots, grouped
into epoch rows, updating live.

## 2. Decisions (from brainstorm)

| Question | Decision |
|----------|----------|
| Illustrative vs. real per-slot data | **Real data.** |
| Freshness model | **Live** — client polls every 30s. Not a cron (Vercel Cron's floor is 1 min and is the wrong tool). |
| Layout | **Epoch ledger** — 4 stacked rows × 32 slots = 128 cells. Real epoch number labels each row; each tile prints its slot index 0–31. |
| Per-slot classification, multi-relay slots | **"Censoring path wins"** — a slot is censoring if *any* censoring relay delivered its block. |
| Entrance animation | Keep the existing `mw-tile-pop` diagonal stagger. |
| In-progress epoch | The top row is the **current, half-filled epoch**; un-happened slots render as pending placeholders and fill in live. |
| New epoch | On completion the rows **shift down**, the oldest row drops off the bottom, a fresh in-progress row enters at the top. |

A working motion prototype validating the in-progress fill and the epoch shift
was reviewed and approved
(`.superpowers/brainstorm/.../epoch-live-motion.html`).

## 3. Architecture overview

A **self-contained live subsystem**, fully additive. It does **not** touch the
existing daily aggregate pipeline (`src/lib/refresh/`, the snapshot tables, the
`/api/refresh` cron). There is **no new database table, no migration, no cron
job**. The relay data APIs are the live source of truth; a short server-side
fetch cache makes it scale.

```
relay data APIs ──▶ src/lib/epochs/ ──▶ /api/epochs route ──▶ EpochLedger (client, polls 30s)
                          │
              composition.tsx (server) ──▶ initial snapshot prop
```

This is one deliberate departure from the v1 rule "pages read only snapshots,
never the external API" (CLAUDE.md) — consciously traded for true-live data. The
departure is contained to the epoch ledger; every other section is unchanged.

> **Revised 2026-05-22:** This subsystem is now DB-backed. The `recent_blocks`
> table is the source of truth; the `/api/epochs` route ingests into it and
> reads from it, and the homepage server-render is a pure DB read. The
> "departure from the v1 rule" described above no longer applies. See
> `2026-05-22-epoch-ledger-db-backed-design.md`.

## 4. Data layer — `src/lib/epochs/`

A new directory. Modules are small and single-purpose so each is testable in
isolation.

### `chain-time.ts`
Pure functions, no I/O. Mainnet beacon-chain constants: genesis time
`1606824023`, `SECONDS_PER_SLOT = 12`, `SLOTS_PER_EPOCH = 32`.

- `currentSlot(now?): number` — head slot from wall-clock time.
- `epochOf(slot): number`
- `epochSlotRange(epoch): { first, last }`
- `latestCompleteEpoch(now?): number` — the most recent fully-elapsed epoch.

The current head slot is what lets the in-progress epoch distinguish a `pending`
slot (not yet happened) from a `nonboost` slot (happened, no relay delivery).

### `relay-payloads.ts`
`RelayPayloadSource` class — same injectable-adapter shape as
`RelayscanDataSource`, so it is mockable in tests. For each configured relay:

```
GET https://{dataApiHost}/relay/v1/data/bidtraces/proposer_payload_delivered?limit=200
```

Confirmed live, public, unauthenticated. Response is an array of objects with
`slot`, `parent_hash`, `block_hash`, `builder_pubkey`, `proposer_pubkey`,
`proposer_fee_recipient`, `gas_limit`, `gas_used`, `value`, `num_tx`,
`block_number` (all strings). Parsed with a zod schema.

- All relays fetched concurrently via `Promise.allSettled`.
- Each relay call gets an `AbortController` timeout (~4s).
- A relay that errors or times out is **skipped** and recorded; the rest still
  produce a result.
- `limit=200` is sufficient headroom: 200 delivered payloads from any single
  relay span well over the ~160 slots (5 epochs) we need.

### `classify.ts`
The "censoring path wins" rule. Input: a slot and the set of relays that
delivered it (looked up against `classifyRelay` from `src/config/relays.ts`).

- `censoring` — at least one **censoring**-posture relay delivered the block.
- `neutral` — delivered by at least one relay, none of them censoring
  (neutral- and unknown-posture relays both land here).
- `nonboost` — zero relay deliveries (locally-built block, or a missed slot —
  see Edge cases).
- `pending` — slot index is beyond the current head slot (in-progress epoch
  only); not a real category, a render state.

### `get-live-epochs.ts`
Orchestrator. `getLiveEpochs(): Promise<LedgerData>`:

1. Compute the in-progress epoch and the 3 epochs before it (4 rows).
2. Fetch recent payloads from all relays (`RelayPayloadSource`).
3. Build a `slot → relayId[]` map.
4. For each of the 128 slots, classify it.
5. Return `{ epochs: EpochRow[], headSlot, fetchedAt, degradedRelays }` where
   each `EpochRow` is `{ epoch, slots: SlotCell[], inProgress }` and a
   `SlotCell` carries `{ slot, indexInEpoch, category, relays, builder,
   valueWei, blockNumber, numTx }` for the hover tooltip.

### `src/config/relays.ts` (modified)
Add a `dataApiHost: string` field to `RelayInfo`. The relayscan `id` is a display
shorthand and is not always a resolvable hostname (the two bloXroute entries in
particular), so each relay's actual data-API host is recorded explicitly.

## 5. API route — `src/app/api/epochs/route.ts`

A new public GET route. Calls `getLiveEpochs()` and returns the `LedgerData` as
JSON.

- Inside `RelayPayloadSource`, the per-relay `fetch` calls use
  `next: { revalidate: 15 }`. Next.js then caches each upstream relay response
  for 15s across **all** requests — so regardless of traffic, upstream load is
  ~8 relay calls per 15s. A 30s client poll always receives data ≤15s stale.
- No secret guard — this is public read-only data, consistent with the existing
  `/api/v1/` routes.

## 6. UI

### `src/components/sections/epoch-ledger.tsx` (new, client component)
Replaces `BlockGrid`. `"use client"`.

Props: `initial: LedgerData` — a server-rendered snapshot so the section paints
immediately (no layout shift, works without JS).

Behaviour:
- On mount, fetch `/api/epochs` immediately, then every **30s** (interval in a
  single exported constant, `POLL_MS`).
- Each poll's result is **diffed** against current state:
  - Slots newly transitioned from `pending` to a real category get the
    `mw-tile-pop` animation.
  - A change in the in-progress epoch number triggers the **shift**.
- Render: 4 rows. Each row has an epoch-number label (left) and a 32-column slot
  grid. Each tile keeps the `tile` class so existing CSS applies; it prints its
  slot index 0–31. The in-progress row's pending slots render as dashed
  placeholders, the next-to-fill slot pulses.
- Hover tooltip — reuses the current `BlockGrid` fixed-position tooltip pattern,
  now showing **real** data: full slot number, epoch, delivering relay(s) +
  posture, builder, value (ETH), tx count.

### `src/components/sections/composition.tsx` (modified)
- Server component calls `getLiveEpochs()` and passes the result as
  `<EpochLedger initial={...} />`.
- Footnote changes from "Each tile ≈ 1/128 of the latest day's blocks" to
  "Each tile = one real slot · live".
- The legend, the two block-count cards, and the "Resistance is winning" insight
  box are unchanged — they remain the *day's* aggregate, a separate stat from the
  live grid.

### `src/components/sections/block-grid.tsx` (deleted)

### Sizing
Grid height drops from ~540px to ~110px — comfortably more than half shorter.

## 7. Animation behaviour

| Event | Behaviour |
|-------|-----------|
| Initial render / first poll | The grid does the existing `mw-tile-pop` diagonal-stagger entrance (`globals.css` keyframes lines 213–217), delay `(rowIndex + slotIndex) × 15ms`. |
| A new slot arrives | Only that tile pops (`mw-tile-pop`); existing tiles are untouched. |
| Pending slot | Dashed placeholder; the next-to-fill slot has a soft pulse. |
| Hover | Existing `hover:scale-[1.55]` carries over unchanged. |
| New epoch completes | The completed in-progress row graduates to a normal row. A new in-progress row enters at the top via a CSS height transition (0 → full); the oldest row collapses out the bottom (full → 0); the rows between glide for free via document flow. **No FLIP library, no new dependency.** |
| Reduced motion | `globals.css` already disables `.tile` animation under `prefers-reduced-motion` (lines 344–358); the shift transitions are written so they simply snap. |

## 8. Testing

- **Unit** (`*.test.ts` beside source):
  - `chain-time.ts` — slot/epoch math at known timestamps and epoch boundaries.
  - `classify.ts` — the "censoring path wins" rule across every relay-set
    combination (censoring-only, neutral-only, mixed, unknown-only, empty).
  - `get-live-epochs.ts` — epoch assembly, the pending-slot boundary.
  - zod parse of a relay payload response.
- **Data source** — `relay-payloads.test.ts` with a captured fixture, in the
  style of `relayscan.test.ts`.
- **e2e** — homepage renders the epoch ledger with 4 rows; one in-progress.

## 9. Edge cases

- **A relay's API is down / slow** — skipped after the timeout; classification
  proceeds with the remaining relays. Recorded in `degradedRelays`. Note: if a
  *censoring* relay is unreachable, some censoring slots may show as neutral for
  that poll; self-heals on the next poll.
- **All relays unreachable / empty result** — the client keeps the last good
  state and shows a subtle "reconnecting" indicator rather than blanking.
- **In-progress epoch** — only the slots up to the current head slot are
  classified; the rest are `pending`.
- **Missed slots** — a slot with no relay delivery is classified `nonboost` in
  v1 (it lumps locally-built blocks and missed slots together). Splitting missed
  slots into their own state needs a beacon-chain data source — deferred.
- **Reorgs** — a slot's delivery set can shift slightly between polls; the diff
  handles it as a normal update.

## 10. Build sequence

1. `chain-time.ts` + tests.
2. `src/config/relays.ts` — add `dataApiHost`.
3. `relay-payloads.ts` (`RelayPayloadSource`) + zod schema + fixture test.
4. `classify.ts` + tests.
5. `get-live-epochs.ts` + tests.
6. `src/app/api/epochs/route.ts`.
7. `epoch-ledger.tsx` — render, then poll + diff, then the pop and shift
   animations.
8. `composition.tsx` — swap in `<EpochLedger>`; delete `block-grid.tsx`.
9. e2e + manual verification.

## 11. Out of scope / future

- A persisted slots table is now **in scope and implemented** as `recent_blocks`
  — see `2026-05-22-epoch-ledger-db-backed-design.md`. A public `/api/v1/epochs`
  endpoint remains out of scope.
- Splitting missed slots from locally-built blocks (needs a beacon API).
- A WebSocket / SSE push instead of polling.
- Per-slot poll cadence (12s) so each slot pops individually — a one-constant
  change (`POLL_MS`) if ever wanted.
