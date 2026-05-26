# Live Ledger JSON Snapshot Read-Through Cache — Design

**Date:** 2026-05-25
**Status:** Draft, revised to use immutable JSON snapshots for the live window
**Topic:** Add the live epoch/block ledger back to the homepage using timestamped JSON snapshots, without a cron.

## 1. Context

The `simplify` branch removed runtime indexing and the live epoch ledger route, leaving the homepage backed by checked-in daily data. The static daily model is correct for the aggregate sections, but it also removed the compact live block tracker that showed recent MEV-Boost blocks as they happened.

The client feedback is that the old tracker's operating model was useful: a route could fetch recent blocks, check who produced them, cache the result, and serve subsequent visitors without requiring a cron. The route only needs a short rolling window, roughly the last 100 blocks, not a full historical index.

This spec adds that back without introducing a writable live SQLite database. The daily aggregate pipeline can continue using its checked-in SQLite artifact, but the live ledger uses small immutable JSON snapshot files. The live ledger remains a read-heavy UI feature; ingestion happens opportunistically when the public ledger route is hit.

## 2. Goals & non-goals

**Goals**
- Restore a live block/epoch tracker to the homepage.
- Fetch and classify roughly the last 100 recent blocks in one route pass.
- Cache route responses so visitor traffic, not cron, drives refreshes.
- Persist the rolling block window as timestamped JSON snapshots so cold server instances can serve the last known state.
- Keep the daily aggregate pipeline separate from the live-window cache.
- Preserve the public read-only stance for normal app pages; only the ledger route writes new live-window snapshots.

**Non-goals**
- No Vercel Cron for the live ledger.
- No long-range per-slot historical archive.
- No replacement for the daily trend, relay, or builder aggregate metrics.
- No WebSocket or SSE push channel.
- No client-side SQLite.
- No mutable `latest.json` pointer unless a future storage layer can update it atomically.

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
            1. read newest timestamped live snapshot, if present
            2. fetch recent relay payloads, limit ~= 100-200 per relay
            3. fold payloads by slot
            4. merge folded rows into the previous snapshot by slot
            5. prune old rows from the in-memory window
            6. write a new immutable timestamped JSON snapshot
            7. best-effort delete older snapshots
            8. return ledger JSON with cache headers

homepage SSR
  -> read newest timestamped live snapshot only
  -> render initial ledger prop
```

The route is a read-through cache. A visitor miss refreshes the JSON live-window snapshot, while cache hits serve without relay fan-out or file/blob writes. With no visitors, nothing runs.

## 5. JSON snapshot format

Store immutable timestamped JSON files in a live-ledger snapshot namespace:

```text
data/live-ledger/2026-05-26T00-12-30-123Z.json
```

Timestamp strings are derived from `new Date().toISOString()` with characters unsafe for file/object names replaced, for example `:` and `.` to `-`.

Snapshot shape:

```ts
type LiveLedgerSnapshot = {
  schemaVersion: 1;
  headSlot: number;
  fetchedAt: string;
  degradedRelays: string[];
  blocks: StoredRecentBlock[];
};

type StoredRecentBlock = {
  slot: number;
  blockNumber: number;
  blockHash: string;
  relays: string[];
  builderPubkey?: string;
  valueWei?: string;
  numTx?: number;
};
```

`blocks` stores one row per delivered slot. Multi-relay slots collapse into one record so the classifier can apply "censoring path wins" at read time.

Retention target:
- Keep at least the last 128 slots needed for the UI.
- Fetch enough headroom to recover from sparse relay deliveries and cache misses, likely 200 delivered payloads per relay.
- Prune block records older than `headSlot - 256`.
- Retain only a small number of snapshot files after each successful route execution, for example the newest 5-10 files, so latest-snapshot discovery stays cheap.

The daily SQLite artifact remains separate. Live snapshot files must not be stored under, copied over, or uploaded to the daily aggregate SQLite artifact path.

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

If all relays fail, the route should serve the previous snapshot if one exists. If no previous snapshot exists, return a valid empty live window where elapsed slots render as `nonboost` and future slots render as `pending`.

## 7. Route contract

`GET /api/epochs`

Behavior:
1. Check route/cache freshness through normal Next/Vercel cache headers.
2. On function execution, read the newest live snapshot if present.
3. Fetch recent relay deliveries.
4. Fold payloads by slot.
5. Merge folded rows with the prior snapshot window by `slot`.
6. Prune block records older than `headSlot - 256`.
7. Write a new timestamped JSON snapshot if at least one relay fetch succeeded.
8. Best-effort delete old snapshot files/objects.
9. Return `LedgerData`.

Suggested response headers:

```
Cache-Control: public, s-maxage=30, stale-while-revalidate=30
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

The daily SQLite artifact remains the canonical source for aggregate historical data. The live ledger needs a narrow exception: `/api/epochs` can write only immutable live-ledger JSON snapshots.

Implementation must make that boundary explicit:
- separate daily artifact query helpers from live-ledger store helpers
- expose no general-purpose write helper to app pages
- treat every snapshot write as immutable
- merge live rows idempotently by `slot`
- tolerate concurrent route executions by allowing duplicate timestamped snapshots
- discover the newest snapshot by sorted timestamp name
- clean old snapshots on a best-effort basis after writing the new one

Production storage can use Vercel Blob with a dedicated prefix, for example:

```text
data/live-ledger/
```

Local development can use the same shape on disk. Suggested defaults:

- local directory: `data/live-ledger/`
- blob prefix: `data/live-ledger/`
- optional overrides: `MEV_WATCH_LIVE_SNAPSHOT_DIR`, `MEV_WATCH_LIVE_BLOB_PREFIX`

Avoid a mutable `latest.json` object because it reintroduces overwrite races and locking. Listing timestamped files/objects is acceptable because cleanup keeps the prefix small.

Do not require cron just to keep the live ledger fresh.

## 9. UI

Restore an `EpochLedger` client component similar to the prior implementation:

- accepts `initial: LedgerData`
- fetches `/api/epochs` on mount and every 30s
- keeps the last good state if a poll fails
- shows a subtle stale/degraded state when relay coverage is partial
- uses fixed slot dimensions so the grid is stable
- preserves pending, censoring, neutral, and nonboost visual categories

The homepage server component reads the newest JSON snapshot and passes an initial ledger snapshot. It should not fetch relay APIs during SSR.

## 10. Testing

Unit tests:
- slot/epoch math at known boundaries
- relay payload parsing
- multi-relay folding by slot
- censoring-path-wins classification
- snapshot merge idempotency and prune boundary
- timestamped snapshot filename sorting/discovery
- old snapshot cleanup boundaries
- snapshot-to-`LedgerData` conversion

Route/integration tests:
- cache-miss path fetches, writes, reads, and returns coherent ledger data
- partial relay failure still returns last known or partially refreshed data
- all-relay failure returns the previous snapshot, or an empty pending/nonboost ledger if none exists
- concurrent route executions can write distinct timestamped snapshots without corrupting the latest readable state
- daily SQLite artifact paths are never used by the live snapshot writer

E2E tests:
- homepage renders the live ledger
- `/api/epochs` returns epoch rows
- repeated page loads do not require a cron-created fixture

## 11. Rollout sequence

1. Land or preserve the daily SQLite data artifact work for aggregate sections.
2. Add live-ledger JSON snapshot store helpers.
3. Add relay payload source and folding logic.
4. Add ledger assembly from snapshot block rows.
5. Add `/api/epochs` read-through route.
6. Restore the homepage `EpochLedger` UI.
7. Add focused unit, route, and e2e coverage.
8. Verify on Vercel that repeated route hits are cache-served, function executions write timestamped snapshots, and cleanup keeps the live prefix small.

## 12. Open questions

- Is 100 recent blocks enough for the UI, or should the route keep fetching 200 delivered payloads per relay to cover gaps and relay skew?
- Route cache, snapshot freshness, and client polling are aligned at 30 seconds.
- Should stale ledger state be visibly labeled after a threshold, for example `fetchedAt` older than 2 minutes?
- How many timestamped live snapshots should production retain: newest 5, newest 10, or a time-based cutoff?
