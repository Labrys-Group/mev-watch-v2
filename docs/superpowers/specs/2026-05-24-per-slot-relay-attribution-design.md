# Per-Slot Relay Attribution — Design

**Date:** 2026-05-24
**Status:** Draft, awaiting user review
**Topic:** Replace relayscan's per-relay payload-delivery aggregates with a per-slot winning-relay attribution from Dune. The headline %, trend chart, and leaderboard surface the same metric definition over a more honest underlying count — one block per slot, attributed to its actual winning relay.

## 1. Context

The dashboard currently reports a censorship % derived from relayscan's daily JSON: censoring relays' share of `num_payloads` summed across all relays. On 2026-05-21 that figure is 33.4%.

`num_payloads` is per relay, and a single block delivered through multiple relays counts in each of their totals. Yesterday's `sum(num_payloads) = 12,516` against a chain block count of 7,178 — the denominator is ~1.75× the actual unique-block count, and censoring relays appear to co-attach to popular slots more often than neutral relays, inflating their share.

The current methodology page defends this with a "ratio cancels the double-counting" argument. That argument assumes the multi-relay overlap is uniformly distributed across postures; it isn't. When a viewer watches blocks land in real time, they see one winning relay per block and observe materially less than 33% routed through censoring relays.

This spec switches the underlying count to **unique blocks per winning relay**, computed by joining each relay's bid traces against the canonical chain block hash. The metric definition, the trend chart, the leaderboard, the methodology page wording, and the JSON API all stay; only the upstream provider for relay data changes.

## 2. Goals & non-goals

**Goals**
- The headline % and trend chart reflect per-block ground truth — one block, one winning relay.
- The leaderboard's per-relay `blocks` column counts unique slots won, not payload claims.
- Historical data (2022-09-15 → today) is re-ingested under the new metric so the trend chart is continuous.
- The change is reversible behind an env-var flag for at least one week post-rollout.

**Non-goals**
- No layout, component, or visual changes to the dashboard, explorer, embed, status page, or JSON API.
- No new tabs, no "actual vs potential" framing, no OFAC-tx detection, no per-block live feed.
- No change to builder data — relayscan stays for builders because each block has exactly one builder; no double-counting issue there.
- No change to the editorial OFAC posture classification in `src/config/relays.ts`. (Open question on bloXroute Max Profit is tracked separately; not in scope here.)

## 3. Approved approach

Selected from three options (Dune SQL, relay bidtraces APIs + RPC dedup, hybrid cutover):

**Dune Analytics** as the single source of truth for per-slot winning relay. A saved Dune query joins `mevboost.payloads_delivered` against `ethereum.blocks` on `block_hash` — only the relay whose claimed block hash matches the canonical chain block is counted for that slot. Aggregated to one row per relay per day.

Builders stay on relayscan — a `CompositeDataSource` fans the daily fetch out to `dune` (relays) and `relayscan` (builders) and merges.

## 4. Architecture

### 4.1 New components

```
src/lib/data-source/
  dune.ts            ← new — Dune query executor & adapter
  dune.test.ts       ← new — fetch mock + parsing
  composite.ts       ← new — fan-out to two DataSources
  composite.test.ts  ← new
  relayscan.ts       ← unchanged
  types.ts           ← unchanged
```

```
docs/dune/
  payloads-delivered.sql   ← new — authoritative SQL, mirror of the saved query
```

```
scripts/
  backfill-dune.ts   ← new — one-time re-ingest of the existing date range
```

### 4.2 Wire-up sites

Each constructs the source today via `new RelayscanDataSource()`. They switch to `new CompositeDataSource(new DuneDataSource(...), new RelayscanDataSource())`:

- `src/app/api/refresh/route.ts`
- `scripts/refresh.ts`
- `scripts/seed-history.ts`

Behind a single env var `DATA_SOURCE_MODE` with values `relayscan | composite`, defaulting to `relayscan`. After cutover stabilises (≥ 1 week), the env var is removed and `composite` becomes the only mode.

### 4.3 Unchanged components

- `src/lib/metrics.ts` — formula is identical
- `src/lib/refresh/index.ts`, `src/lib/refresh/persist.ts` — already `DataSource`-agnostic
- `src/lib/db/schema.ts` — `blocks` column semantics are now correct rather than misleading
- `src/lib/queries.ts` — same shape returned
- All page components, FAQ, hero verdict, embed, JSON API routes, status page

## 5. Dune query

The saved query (committed at `docs/dune/payloads-delivered.sql`):

```sql
SELECT
  pd.relay        AS relay,
  COUNT(*)        AS num_payloads,
  CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(10,4)) AS percent
FROM mevboost.payloads_delivered AS pd
JOIN ethereum.blocks            AS b
  ON pd.block_hash = b.hash
WHERE pd.block_date = DATE '{{date}}'
GROUP BY pd.relay
ORDER BY num_payloads DESC
```

Notes:
- The join filters to the relay whose claimed block hash matches the canonical chain block — the actual winner.
- `block_date` is a partitioned column on the Dune side; the filter pushes down efficiently.
- The `{{date}}` parameter is supplied per execution via Dune's parameter API.
- `percent` is computed inside Dune for parity with relayscan's response shape; the persist layer recomputes shares anyway, so this is informational.

The exact table name (`mevboost.payloads_delivered`) is the leading candidate. If verification on Dune shows a different canonical table (`dune.mevboost.payloads_delivered`, `mev_boost.delivered_payloads`, etc.), the SQL is adjusted at implementation time — table name is a one-line correction, not an architectural change.

## 6. Dune adapter

```ts
// src/lib/data-source/dune.ts

import { z } from "zod";
import type { DataSource, DayRelayStats } from "./types";

const ResultRow = z.object({ relay: z.string(), num_payloads: z.number() });

export class DuneDataSource implements DataSource {
  readonly name = "dune.com";
  constructor(
    private readonly apiKey: string,
    private readonly queryId: number,
  ) {}

  async fetchDay(date: string): Promise<DayRelayStats> {
    const executionId = await this.execute(date);
    await this.pollUntilComplete(executionId);
    const rows = await this.fetchResults(executionId);
    return {
      date,
      relays: rows.map((r) => ({ relayId: r.relay, numPayloads: r.num_payloads })),
      builders: [], // filled by the composite from relayscan
    };
  }
  // execute / pollUntilComplete / fetchResults — private helpers using the
  // Dune Query API v1 endpoints under https://api.dune.com/api/v1/
}
```

- API base: `https://api.dune.com/api/v1/`
- Endpoints: `POST /query/{queryId}/execute` → returns `execution_id`; `GET /execution/{execution_id}/status` polled until `QUERY_STATE_COMPLETED`; `GET /execution/{execution_id}/results` returns rows.
- Polling: 2-second interval, 60-second timeout per day. Typical wall time 5–30s on free tier.
- Errors: any non-200 response or `QUERY_STATE_FAILED` throws — propagates up the existing refresh error path, which logs to `refresh_log` and pings Slack.

## 7. Composite source

```ts
// src/lib/data-source/composite.ts

export class CompositeDataSource implements DataSource {
  readonly name: string;
  constructor(
    private readonly relays: DataSource,
    private readonly builders: DataSource,
  ) {
    this.name = `${relays.name}+${builders.name}`;
  }

  async fetchDay(date: string): Promise<DayRelayStats> {
    const [r, b] = await Promise.all([
      this.relays.fetchDay(date),
      this.builders.fetchDay(date),
    ]);
    return { date, relays: r.relays, builders: b.builders };
  }
}
```

Fail-closed: if either child throws, the composite throws. The refresh layer treats it as a day-level failure (same as a relayscan outage today).

The audit log records `dune.com+relayscan.io` as the source string, providing forensic clarity for any future investigation of a specific day's numbers.

## 8. Schema impact

**None.** The change is entirely in upstream meaning:

| Column | Old meaning | New meaning |
|---|---|---|
| `relay_daily_stats.blocks` | Payload deliveries claimed (double-counted across relays) | Unique blocks won by this relay |
| `daily_stats.total_blocks` | Sum of all relays' claimed deliveries | Sum of unique blocks per relay (≈ unique MEV-boost blocks that day) |
| `daily_stats.censorship_pct` | Censoring relays' share of total claimed deliveries | Censoring relays' share of unique blocks won |
| `daily_stats.neutral_pct` | Complementary | Complementary |
| `daily_stats.non_boost_pct` | Unchanged — comes from RPC | Unchanged |
| `builder_daily_stats.*` | Unchanged — from relayscan | Unchanged |

The `blocks` column was already named to mean "blocks delivered." The old value was wrong for that name; the new value is right. No migration required.

## 9. Backfill plan

`scripts/backfill-dune.ts` follows the existing `seed-history.ts` pattern:

1. Read the current min/max date from `daily_stats` (today: 2022-09-15 → today).
2. For each date in range, call `compositeSource.fetchDay(date)` and persist via `persistDailySnapshot` (the existing upsert path — overwrites the existing row).
3. Throttle to 3 concurrent days (Dune free-tier concurrency limit). Per-day wall time ~10–15s; total wall time ≈ 75–120 min for 1,344 days.
4. On any per-day failure: log to `refresh_log`, continue to the next date. The script is restartable — it skips dates already marked `status=ok` with source `dune.com+relayscan.io` in `refresh_log`.
5. Builder rows are not re-ingested. Existing builder data stays untouched.

**Cutover sequence**

1. Merge the adapter + composite + backfill script, env-var defaulting to `relayscan`. No behaviour change.
2. Local dry-run against a fresh DB copy: run `backfill-dune.ts`, eyeball the headline number for 2026-05-21 (expect a drop from 33.4% to roughly 10–15%).
3. In production, set `DATA_SOURCE_MODE=composite`, run `backfill-dune.ts` against the prod DB. The refresh cron and seed scripts now use the composite for new days too.
4. Verify the dashboard, status page, and JSON API. Monitor `refresh_log` for any source-string anomalies.
5. After ≥ 1 week of stable runs, remove the env var and hard-code the composite source.

**Reversibility**

If at any point the new metric reads as wrong, set `DATA_SOURCE_MODE=relayscan` and re-run `scripts/seed-history.ts` to restore the old numbers. Recovery window: ~90 minutes for full backfill from relayscan.

## 10. Methodology page updates

`src/app/methodology/page.tsx` carries copy that defends the old metric. The following sections change:

- **Section 4 (The metric)** — replace the "share of payload deliveries" formulation with "share of MEV-boost blocks whose winning relay is classified as censoring." Remove the multi-relay double-counting paragraph entirely. Add one short paragraph explaining the per-slot dedup (join against canonical block hash).
- **Section 3 (Data source)** — relayscan stays cited for builder data; Dune added as the source for relay attribution, with one sentence on why (per-slot winner needed; relayscan's daily JSON exposes per-relay aggregates only).
- **Section 6, Limitation 02 ("Locally-built blocks are not counted")** — minor wording update. The new denominator is strictly unique MEV-boost blocks, so the overstatement caveat reads cleaner.

Hero, composition, leaderboard, FAQ, embed, status page copy: unchanged. They describe the high-level concept ("block flow through censoring relays"), which remains accurate.

## 11. Testing

**Unit (Vitest, file-beside-source):**

- `dune.test.ts` — mocks `fetch` for the three Dune endpoints, verifies poll-to-completion, asserts the adapter maps rows into `RelayPayloadCount[]` and surfaces errors as thrown exceptions. Mirrors `relayscan.test.ts`.
- `composite.test.ts` — verifies parallel `fetchDay`, correct merge, fail-closed propagation.
- `metrics.test.ts` — no changes; the formula is unchanged.
- `persist.test.ts` — no changes; upsert path is unchanged.

**Integration (one-off, not committed):**

- Run the backfill against a fresh DB copy of prod data.
- Anchor 1: latest day (2026-05-21) headline drops from 33.4% to ~10–15%.
- Anchor 2: 2023-12-17 (day before the bloXroute Max Profit posture change in `relays.ts`) has a lower censorship % than 2023-12-19, confirming the date-aware classification still composes correctly with the new data.

**E2E:** no changes. `e2e/dashboard.spec.ts` covers the dashboard rendering with data; the rendered numbers differ but the render is intact.

**Manual smoke:** after backfill, `pnpm dev` and click through `/`, `/methodology`, `/explorer`, `/status`, `/embed`, and the JSON API routes `/api/v1/summary`, `/api/v1/trend`, `/api/v1/relays`.

## 12. Risks & open questions

- **Dune SLA**: the Dune free-tier has no SLA. If a daily refresh hits a Dune outage, the cron logs the failure and the dashboard's "last refresh" status surfaces it — no different from a relayscan outage today. A multi-day outage will leave the headline stale; this is acceptable per the existing system's posture.
- **Dune table naming**: `mevboost.payloads_delivered` is the leading candidate but unverified end-to-end. If the canonical name differs, the SQL gets a one-line correction at implementation. Confirmed during implementation by running the query manually in Dune before wiring it up.
- **Free-tier rate limit**: 3 concurrent executions × 10–15s per query. Backfill (1,344 days) takes the ~75–120 min quoted in §9; well within tolerance. Daily refresh is one query per day, far under any rate limit.
- **bloXroute Max Profit classification**: the 17% load-bearing classification claim (the 2023-12-18 announcement) is out of scope for this spec but should be independently verified — flagged as a separate work item.
