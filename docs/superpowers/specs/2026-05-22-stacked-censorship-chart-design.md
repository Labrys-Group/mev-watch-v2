# Stacked 100% Censorship Composition Chart — Design

**Date:** 2026-05-22
**Status:** Draft, awaiting user review
**Topic:** Replace the single-area censorship trend chart with a 100% stacked
area chart of three bands — non-boosted, censored, non-censored — over *all*
Ethereum blocks. Requires sourcing total daily block counts, which the current
data pipeline does not capture.

## 1. Context & problem

`src/components/sections/trend-chart.tsx` renders one recharts `Area` of
`censorshipPct` — censoring relays' share **of MEV-boost blocks**. The y-axis
*is* the headline censorship metric.

The request: a 100% stacked chart with three bands, top→bottom **non-boosted /
censored / non-censored**, in pastel green / red / neutral gray.

The blocker: "non-boosted" blocks — Ethereum blocks proposed locally without
MEV-boost — are not in our data. relayscan's `/stats/day/{date}/json` returns
only per-relay payload counts and per-builder block counts; it never sees a
block that skipped every relay. `metrics.ts` already has a `nonBoostPct` field
hardcoded to `0` with a comment that it is "not derivable from relayscan's
aggregate API."

It *is* derivable with one extra input: the total number of execution-layer
blocks proposed each day. `non-boosted = total chain blocks − MEV-boost blocks`.

A free, no-subscription source works. Verified against a public Ethereum RPC
(`ethereum-rpc.publicnode.com`, no key) by binary-searching blocks by
timestamp:

| Day | Total chain blocks | MEV-boost blocks | Non-boosted |
|---|---|---|---|
| 2026-05-20 | 7,176 | 6,707 | 469 (**6.5%**) |
| 2025-11-15 | 7,153 | 6,659 | 494 (**6.9%**) |

So the gray band is a real, visible ~6–7% slice.

## 2. Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Real non-boosted data vs. placeholder | **Source it now** — confirmed free (public RPC, no subscription). |
| Headline censorship metric | **Unchanged.** Chart NOW/PEAK/TROUGH, the Hero verdict, and `/api/v1` keep reporting censoring share *of MEV-boost*. The stack is a separate composition view. |
| Colour tokens | **Retune** `--neutral` → pastel green and `--ofac` → red, both modes. This also shifts the Epoch Ledger tiles — accepted, for site-wide consistency. |
| Block-count source failure | **Must not fail the daily refresh** — the relayscan censorship data persists regardless; non-boost degrades to 0 for that day (see §10). |

## 3. The denominator change

The current chart's denominator is *MEV-boost blocks*. A three-way 100% stack
must use *all Ethereum blocks*. With `C` = `censorshipPct` (share of MEV-boost)
and `N` = `nonBoostPct` (share of all blocks), each stored daily row yields
three bands that sum to 100:

```
nonBoostBand     = N
censoredBand     = C        × (100 − N) / 100
nonCensoredBand  = (100 − C) × (100 − N) / 100
```

Consequence, surfaced and accepted in the brainstorm: the **red band's
thickness no longer equals the headline censorship %** — it reads `C × boost
share` (≈ 44% when `C` = 47%). The headline number still equals `censoredBand ÷
(censoredBand + nonCensoredBand)`. The chart's NOW/PEAK/TROUGH header keeps
showing the headline metric unchanged; the hover tooltip lists all three band
percentages **plus** the headline rate, so the relationship is explicit.

A day with `N = 0` (not yet backfilled, or a block-count fetch failure)
collapses cleanly to the old two-way split — no special-casing needed.

## 4. New data source — `BlockCountSource`

A second source type, parallel to the existing `DataSource`, added to
`src/lib/data-source/types.ts`:

```ts
export interface BlockCountSource {
  readonly name: string;
  /** Total execution-layer blocks proposed during the given UTC date. */
  totalBlocks(date: string): Promise<number>;
}
```

Implementation: `src/lib/data-source/eth-rpc.ts` → `EthRpcBlockCountSource`.

- `totalBlocks(date)` = `firstBlockAtOrAfter(endOfDayTs) −
  firstBlockAtOrAfter(startOfDayTs)`, where the day is the UTC `[00:00, 24:00)`
  window.
- `firstBlockAtOrAfter(ts)`: estimate the block number via 12 s/slot from the
  chain head, then binary-search a bounded window (~14 `eth_getBlockByNumber`
  calls). ~28 calls per day total; the two boundary lookups run in parallel.
- **RPC endpoint:** an ordered fallback list of public RPCs (publicnode,
  llamarpc, ankr, cloudflare) tried in turn with a per-call timeout + retry.
  Overridable via a new optional `ETH_RPC_URL` env var so production can point
  at a dedicated free-tier endpoint (Alchemy/Infura) for reliability. Zero
  config works in dev. Added to `.env.example`, commented.
- The HTTP/JSON-RPC client is injectable via the constructor so the
  binary-search logic is unit-testable without network. The pure search routine
  — `findBlockAtOrAfter(targetTs, { head, getTimestamp })` — is exported for
  tests.

Only complete past days are ever requested (`pnpm refresh` defaults to
yesterday; `seed-history` backfills past days), so the end boundary is never in
the future.

## 5. Metrics — `computeDailyStats`

`src/lib/metrics.ts` `computeDailyStats` gains the builder counts and the chain
total. New signature:

```ts
computeDailyStats(
  relays: RelayPayloadCount[],
  builders: BuilderBlockCount[],
  totalChainBlocks: number,
  date: string,
): DailyStatsResult
```

- `mevBoostBlocks` = `sum(builders[].numBlocks)` — relayscan counts each
  delivered block once per builder, so the sum is the day's distinct MEV-boost
  block count. (Verified: 6,707 vs. 7,176 total ≈ 93.5% MEV-boost, consistent
  with relayscan's published share.)
- `nonBoostPct` = `clamp((totalChainBlocks − mevBoostBlocks) / totalChainBlocks
  × 100, 0, 100)`. Clamped defensively: day-boundary noise between relayscan's
  UTC day and execution-block timestamps could nudge the raw value slightly
  out of range. `totalChainBlocks ≤ 0` ⇒ `nonBoostPct = 0`.
- `censorshipPct`, `neutralPct`, `totalBlocks` (relay-payload deliveries) are
  computed exactly as today — **the headline metric is untouched**.

## 6. Schema & pipeline

**Schema** (`src/lib/db/schema.ts`) — `dailyStats` gains one column for
provenance; `nonBoostPct` already exists:

```ts
totalChainBlocks: integer("total_chain_blocks").notNull().default(0),
```

`pnpm db:generate` produces the migration; `0` on existing rows means "not yet
backfilled" (a real day always has ~7,150+ blocks). Backfill (§7) fills them.

**Types** — `src/lib/data-source/types.ts` adds `DaySnapshot = DayRelayStats &
{ totalChainBlocks: number }`. The relayscan adapter still returns
`DayRelayStats`; `refreshDay` enriches it into a `DaySnapshot`.

**Pipeline:**

- `refreshDay(date, source, blockSource, deps)` — new `blockSource:
  BlockCountSource` parameter. It fetches the relayscan day and
  `blockSource.totalBlocks(date)`, merges them into a `DaySnapshot`, and passes
  that to `persist`. See §10 for the failure path.
- `persistDailySnapshot(day: DaySnapshot)` — writes the real `nonBoostPct` from
  `computeDailyStats` and the new `totalChainBlocks` column. Still idempotent
  (upsert by date).
- Callers thread a `BlockCountSource` through: `/api/refresh/route.ts`,
  `scripts/refresh.ts`, `scripts/seed-history.ts` — each constructs
  `new EthRpcBlockCountSource()` alongside `new RelayscanDataSource()`.

## 7. Backfill

Existing `daily_stats` rows have `nonBoostPct = 0`. A one-off
`scripts/backfill-nonboost.ts`:

- For each `daily_stats` row: `totalChainBlocks` from `EthRpcBlockCountSource`;
  `mevBoostBlocks` = `SUM(blocks)` from `builder_daily_stats` for that date
  (already persisted — no relayscan re-fetch needed); recompute and `UPDATE`
  `nonBoostPct` + `totalChainBlocks`.
- Sequential oldest→newest, reusing each day's end-boundary block as the next
  day's start boundary to roughly halve RPC calls.
- Idempotent — safe to re-run, and doubles as a repair tool for any day a live
  refresh recorded with `totalChainBlocks = 0`.

Until it runs, history renders a flat 0% gray band (the §3 graceful collapse).

## 8. The chart component

`src/components/sections/trend-chart.tsx` becomes a stacked `AreaChart`.

- A pure, exported, unit-tested transform — `src/lib/composition.ts`,
  `toCompositionPoint(point)` — maps each `TrendPoint` to `{ date, nonCensored,
  censored, nonBoost, censorshipPct }` using the §3 formulas. The component
  maps the sliced series through it.
- Three `<Area stackId="1">`, declared bottom→top so the visual order is
  non-boosted (top) / censored / non-censored (bottom): `nonCensored`,
  `censored`, `nonBoost`.
- Flat fills — `fillOpacity` ≈ 0.9, 1px stroke in the same colour. The current
  `accentGradient` `<defs>` is removed (gradients muddy a stacked composition).
- `type="monotone"` and the on-mount sweep animation are kept; the per-point
  `activeDot` is dropped (noisy across three areas — the tooltip cursor line
  remains).
- **Tooltip:** a custom content component listing all three bands as
  percentages, plus the headline censorship rate for the hovered day.
- **Legend:** a compact custom legend row (three swatches + labels) in the
  site's mono style, matching the stat-header aesthetic — recharts' default
  `<Legend>` is not used. Three bands need labels.
- Y-axis stays `[0, 100]` with ticks `[0, 25, 50, 75, 100]`; it is now a
  composition axis. The NOW/PEAK/TROUGH header and the `summary` prop are
  unchanged.
- `TrendPoint` (`src/lib/queries.ts`) gains `nonBoostPct: number`; `getTrend()`
  selects `dailyStats.nonBoostPct`. `summarise` is unchanged (headline metric).

## 9. Colours

Retune two semantic tokens in `src/app/globals.css`, both light and dark. They
are shared with the Epoch Ledger, which shifts to match — intended.

| Token | Role | Light (proposed) | Dark (proposed) |
|---|---|---|---|
| `--neutral` | non-censored band | pastel green `#A4D7A9` | `#7AD9A2` |
| `--ofac` | censored band | red `#E07A6B` | `#FF6B6B` (already red) |
| `--non-boost` | non-boosted band | gray `#C2C4D2` (unchanged) | `#565870` (unchanged) |

Exact hexes are to be confirmed visually during implementation (`pnpm dev` +
design review) — the constraint is "pastel green / red / neutral gray," legible
on both backgrounds and distinct from the accent.

## 10. Error handling

| Situation | Behaviour |
|---|---|
| One RPC endpoint down | Fallback list advances to the next endpoint. |
| **All RPCs fail** | `blockSource.totalBlocks` throws; `refreshDay` catches it, persists the relayscan day with `totalChainBlocks = 0` / `nonBoostPct = 0`, logs the day as `ok` with a message noting degraded block count, and sends a Slack *warning* (not a failure). The censorship data is never lost; backfill repairs the gap later. |
| relayscan fetch fails | Unchanged — whole refresh fails and alerts, as today. |
| `mevBoostBlocks > totalChainBlocks` (boundary noise) | `nonBoostPct` clamps to 0 (§5). |
| History not yet backfilled | Flat 0% gray band; chart still correct (§3). |

The principle: the relayscan censorship metric is the product's core and must
not be held hostage to a public RPC's uptime.

## 11. API & other consumers

- `/api/v1/trend` returns `TrendPoint[]`, so it gains `nonBoostPct` per point
  automatically — extra public transparency, no extra work.
- `getLatestStats().nonBoostPct` already exists and is consumed by the Hero
  verdict / composition surfaces; it transitions from a constant `0` to a real
  ~6–7%. Implementation must verify those consumers render a real value
  sensibly (this is expected, not a regression).
- `/api/v1/summary` is unchanged in shape.

## 12. Testing

- `metrics.test.ts` — updated for the new `computeDailyStats` signature:
  `nonBoostPct` computation, the `[0,100]` clamp, `totalChainBlocks = 0`.
- `composition.test.ts` (new) — `toCompositionPoint`: bands sum to 100, the
  `N = 0` collapse, clamping.
- `eth-rpc.test.ts` (new) — `findBlockAtOrAfter` against a synthetic timestamp
  function: locates the boundary, handles estimate drift; fallback advances on
  a failing client. No network.
- `refresh` tests — a fake `BlockCountSource` injected; the all-RPCs-fail path
  persists the day with `nonBoostPct = 0` and logs `ok`.
- e2e — the trend chart still renders within the homepage; extend to assert
  three stacked bands are present.

## 13. Out of scope

- Splitting non-boosted into "locally built" vs. "missed slot" — needs a beacon
  API; the single non-boosted band is sufficient.
- Changing the headline censorship metric or its definition anywhere.
- A dedicated/paid RPC provider — the public fallback list plus the optional
  `ETH_RPC_URL` override covers both dev and production.
- Backfilling `totalChainBlocks` into any table other than `daily_stats`.

## 14. Build sequence

1. `BlockCountSource` type + `EthRpcBlockCountSource` (`eth-rpc.ts`) with the
   exported pure search routine; `eth-rpc.test.ts`.
2. Schema: add `totalChainBlocks`; `pnpm db:generate` + `pnpm db:migrate`.
3. `computeDailyStats` new signature + `metrics.test.ts` updates.
4. `DaySnapshot` type; `persistDailySnapshot` and `refreshDay` threading +
   refresh tests, including the degraded-block-count path.
5. Thread `EthRpcBlockCountSource` through `/api/refresh`, `scripts/refresh.ts`,
   `scripts/seed-history.ts`.
6. `scripts/backfill-nonboost.ts`; run it against the local DB.
7. `src/lib/composition.ts` + `composition.test.ts`; `TrendPoint` +
   `getTrend()` gain `nonBoostPct`.
8. Retune `--neutral` / `--ofac` in `globals.css`.
9. Rebuild `trend-chart.tsx` as the stacked chart: three bands, custom tooltip,
   custom legend.
10. Verify Epoch Ledger and Hero-verdict surfaces against the retuned tokens
    and the now-real `nonBoostPct`; update e2e.
