# Live Ledger SQLite Read-Through Cache — Design

**Date:** 2026-05-25
**Status:** Draft, for a follow-up PR after the SQLite artifact work
**Topic:** Add the live epoch/block ledger back to the homepage using a SQLite-backed read-through cache, without a cron.

## 1. Context

The `simplify` branch removed runtime indexing and the live epoch ledger route, leaving the homepage backed by checked-in daily data. The static daily model is correct for the aggregate sections, but it also removed the compact live block tracker that showed recent MEV-Boost blocks as they happened.

The client feedback is that the old tracker's operating model was useful: a route could fetch recent blocks, check who produced them, cache the result, and serve subsequent visitors without requiring a cron. The route only needs a short rolling window, roughly the last 100 blocks, not a full historical index.

This spec adds that back assuming the SQLite data work exists first. SQLite backs both the daily artifact and a small live-window cache table. The live ledger remains a read-heavy UI feature; ingestion happens opportunistically when the public ledger route is hit.

## 2. Goals & non-goals

**Goals**
- Restore a live block/epoch tracker to the homepage.
- Fetch and classify roughly the last 100 recent blocks in one route pass.
- Cache route responses so visitor traffic, not cron, drives refreshes.
- Persist the rolling block window in SQLite so cold server instances can serve the last known state.
- Keep the daily aggregate pipeline separate from the live-window cache.
- Preserve the public read-only stance for normal app pages; only the ledger route performs controlled live-window writes.

**Non-goals**
- No Vercel Cron for the live ledger.
- No long-range per-slot historical archive.
- No replacement for the daily trend, relay, or builder aggregate metrics.
- No WebSocket or SSE push channel.
- No client-side SQLite.

## 3. Product behavior

The homepage composition section regains a compact live ledger:

- Show the current epoch plus the previous three epochs, 4 rows x 32 slots.
- Each tile represents one real Ethereum slot.
- Recently fetched delivered blocks show the winning relay path classification.
- Slots beyond the current head are `pending`.
- Slots with no known MEV-Boost delivery in the cache are `nonboost`.
- Client polling can remain at 30s, but most polls should be served by route/CDN cache.

Classification keeps the previous rule: **censoring path wins**. If any censoring relay delivered a block for a slot, that slot is classified as `censoring`; otherwise delivered slots are `neutral`.

## 4. Architecture

```
visitor / client poll
  -> GET /api/epochs
       -> CDN / route cache hit: return cached ledger
       -> cache miss:
            1. fetch recent relay payloads, limit ~= 100-200 per relay
            2. fold payloads by slot
            3. upsert recent blocks into SQLite
            4. prune old rows
            5. read SQLite window
            6. return ledger JSON with cache headers

homepage SSR
  -> read SQLite live window only
  -> render initial ledger prop
```

The route is a read-through cache. A visitor miss refreshes the SQLite live-window table, while cache hits serve without relay fan-out or SQLite writes. With no visitors, nothing runs.

## 5. SQLite schema

Add live-window tables to the SQLite database after the SQLite artifact work lands.

```sql
CREATE TABLE IF NOT EXISTS recent_blocks (
  slot INTEGER PRIMARY KEY,
  block_number INTEGER NOT NULL,
  block_hash TEXT NOT NULL,
  relays_json TEXT NOT NULL,
  builder_pubkey TEXT,
  value_wei TEXT,
  num_tx INTEGER,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS recent_blocks_fetched_at_idx
  ON recent_blocks(fetched_at);
```

`relays_json` stores the relay ids observed for the slot. Multi-relay slots collapse into one row so the classifier can apply "censoring path wins" at read time.

Retention target:
- Keep at least the last 128 slots needed for the UI.
- Fetch enough headroom to recover from sparse relay deliveries and cache misses, likely 200 delivered payloads per relay.
- Prune rows older than `headSlot - 256`.

## 6. Data source

Reuse the relay data API model from the earlier live-ledger specs:

```
GET https://{relayDataApiHost}/relay/v1/data/bidtraces/proposer_payload_delivered?limit=200
```

Each relay fetch:
- has a short timeout
- is parsed with a schema
- is allowed to fail independently
- contributes payloads to a `slot -> relays[]` fold

The route should not wait for perfect relay coverage. If one relay fails, write the successful rows and return `degradedRelays` in the response.

## 7. Route contract

`GET /api/epochs`

Behavior:
1. Check route/cache freshness through normal Next/Vercel cache headers.
2. On function execution, fetch recent relay deliveries.
3. Upsert folded rows into SQLite.
4. Read the SQLite window.
5. Return `LedgerData`.

Suggested response headers:

```
Cache-Control: public, s-maxage=10, stale-while-revalidate=30
```

The exact cache window can be tuned, but it should be short enough to feel live and long enough that many viewers do not multiply relay load. The client can still poll every 30s.

Response shape:

```ts
type LedgerData = {
  headSlot: number;
  fetchedAt: string;
  degradedRelays: string[];
  epochs: EpochRow[];
};

type EpochRow = {
  epoch: number;
  inProgress: boolean;
  slots: SlotCell[];
};

type SlotCell = {
  slot: number;
  indexInEpoch: number;
  category: "censoring" | "neutral" | "nonboost" | "pending";
  relays: string[];
  builderPubkey?: string;
  valueWei?: string;
  blockNumber?: number;
  blockHash?: string;
  numTx?: number;
};
```

## 8. Runtime write model

The daily SQLite artifact remains the canonical source for aggregate historical data. The live ledger needs a narrow exception: `/api/epochs` can write only to `recent_blocks`.

Implementation must make that boundary explicit:
- separate daily artifact query helpers from live-ledger store helpers
- expose no general-purpose write helper to app pages
- keep writes idempotent by `slot`
- serialize writes through a single transaction per route execution
- tolerate concurrent invocations by using upserts

If production uses Vercel Blob for the SQLite artifact, the live-window write path must avoid corrupting the daily artifact. Prefer either:
- a separate live SQLite blob/object for `recent_blocks`, or
- a managed writable SQLite-compatible store dedicated to the live window

Do not require cron just to keep the live ledger fresh.

## 9. UI

Restore an `EpochLedger` client component similar to the prior implementation:

- accepts `initial: LedgerData`
- fetches `/api/epochs` on mount and every 30s
- keeps the last good state if a poll fails
- shows a subtle stale/degraded state when relay coverage is partial
- uses fixed slot dimensions so the grid is stable
- preserves pending, censoring, neutral, and nonboost visual categories

The homepage server component reads the SQLite window and passes an initial ledger snapshot. It should not fetch relay APIs during SSR.

## 10. Testing

Unit tests:
- slot/epoch math at known boundaries
- relay payload parsing
- multi-relay folding by slot
- censoring-path-wins classification
- SQLite upsert idempotency and prune boundary
- read-window to `LedgerData` conversion

Route/integration tests:
- cache-miss path fetches, writes, reads, and returns coherent ledger data
- partial relay failure still returns last known or partially refreshed data
- empty SQLite live window returns a valid pending/nonboost ledger

E2E tests:
- homepage renders the live ledger
- `/api/epochs` returns epoch rows
- repeated page loads do not require a cron-created fixture

## 11. Rollout sequence

1. Land the SQLite data artifact work.
2. Add `recent_blocks` schema and live-ledger store helpers.
3. Add relay payload source and folding logic.
4. Add ledger assembly from SQLite rows.
5. Add `/api/epochs` read-through route.
6. Restore the homepage `EpochLedger` UI.
7. Add focused unit, route, and e2e coverage.
8. Verify on Vercel that repeated route hits are cache-served and that function executions refresh the live window without cron.

## 12. Open questions

- Should the live-window SQLite database be a separate artifact from the daily aggregate SQLite database?
- Is 100 recent blocks enough for the UI, or should the route keep fetching 200 delivered payloads per relay to cover gaps and relay skew?
- Should the route cache be closer to one slot (`s-maxage=10-12`) or aligned with the client poll interval (`s-maxage=30`)?
- Should stale ledger state be visibly labeled after a threshold, for example `fetchedAt` older than 2 minutes?
