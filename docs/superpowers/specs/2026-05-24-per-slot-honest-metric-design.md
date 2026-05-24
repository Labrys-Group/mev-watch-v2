# Per-Slot Honest Censorship Metric — Design

**Date:** 2026-05-24
**Status:** Approved, ready for implementation planning (grilled 2026-05-24 — see §2)
**Topic:** Add a per-slot deduplicated censorship metric alongside the existing relayscan per-payload metric, sourced directly from each relay's `/proposer_payload_delivered` endpoint. Fix the silent bloXroute polling failure as a prerequisite.
**Supersedes:** `2026-05-24-per-slot-relay-attribution-design.md` (cancelled — assumed a Dune table that doesn't exist; this design uses the relays' own data APIs which the codebase already polls for the epoch ledger).

## 1. Context & problem

Two issues, both surfaced in the 2026-05-24 analytics review:

### 1.1 The current daily metric is structurally inflated

`metrics.ts:computeDailyStats` divides `Σ relay.numPayloads` for censoring relays over `Σ relay.numPayloads` across all relays. The methodology header at `metrics.ts:47-50` claims the ratio is honest because multi-relay double-counting "cancels between numerator and denominator." Verified empirically on 2026-05-21:

| Field | Value |
|---|---|
| `total_blocks` (Σ `num_payloads`) | 12,516 |
| `total_chain_blocks` (actual UTC-day slots) | 7,178 |
| Multi-delivery factor | **1.74×** |
| Reported censorship % | 33.4% |

The "cancels" claim only holds if multi-relay delivery is **uniform across postures**. It isn't — the two bloXroute relays are operated by one entity, both flagged censoring, and most validators register with both. A single bloXroute-won slot tends to log under both Max Profit *and* Regulated, double-counting the censoring numerator more aggressively than neutral pairs (e.g., Ultra Sound + Titan) double-count the denominator.

Net effect: 33.4% is a structurally inflated upper bound. Honest per-slot dedup will be lower — the order of magnitude implied by the prior cancelled spec was 10–18%, though the actual number is what this work measures.

### 1.2 Live polling silently drops bloXroute

`recent_blocks` (the table behind the live epoch ledger) over a 220-slot sample (~51 min, span 14393894→14394149) breakdown:

```
Ultra Sound       152 slots (69%)
Titan             116 slots (53%)
Aestus             38 slots (17%)
Flashbots          10 slots ( 5%)
Agnostic            8 slots ( 4%)
EthGas              5 slots ( 2%)
bloXroute Max Profit    0 slots
bloXroute Regulated     0 slots
```

Both bloXroute endpoints respond fine to direct `curl` from the same environment (slot 14397988 returns a current record), but `RelayPayloadSource.fetchRecentDeliveries` (`src/lib/epochs/relay-payloads.ts`) records zero deliveries from either. With 31% combined market share on 2026-05-21, expected count over 220 slots is ~70. Seeing zero is conclusive.

The cause is hidden by `Promise.allSettled` swallowing per-relay rejections without surfacing them. The live epoch ledger on the homepage is therefore showing a censoring-free picture for slots that almost certainly include bloXroute. Independently of the daily-metric work, this bug means the homepage's most-visible visualisation is biased.

**Root cause confirmed (grill 2026-05-24):** five-trial probe of both `bloxroute.max-profit.blxrbdn.com` and `bloxroute.regulated.blxrbdn.com` at `limit=200` returns **HTTP 400 — `{"code":400,"message":"maximum limit is 100"}`**. Our code at `relay-payloads.ts:37` hardcodes `?limit=200`. At `limit=100`, both endpoints return 200 OK with valid records. Two-line code fix; the silent-failure code path (`ingest.ts:51` discards the `failedRelays` list) is the broader bug.

**Fixing this is a hard prerequisite.** Without it, a "honest" per-slot daily metric would silently exclude the same 31% market share and read near-zero censoring — strictly worse than today's known-inflated 33%.

## 2. Decisions

Locked during a structured grill on 2026-05-24 (8 design branches resolved). Each row below names the binding choice; alternatives considered are recorded in the rollout notes.

| # | Question | Decision |
|---|---|---|
| 1 | Replace or augment the relayscan metric? | **Augment.** Keep `RelayscanDataSource`, keep `daily_stats` columns. Add new fields and a sibling `slot_deliveries` table. |
| 2 | Attribution rule for a multi-relay slot | **Any-censoring.** Slot is censored iff ≥1 delivering relay is censoring. Semantic: "this block passed through OFAC-filtering infrastructure on its way to the chain." |
| 3 | Per-slot persistence granularity | **Full relay arrays** per slot in `slot_deliveries`. ~7,200 rows/day, ~150 B/row → ~400 MB/yr. Cheap; gives forensic audit if a day's number looks off. |
| 4 | Failure rule on partial relay data | **NULL if any >1% historical-share relay missing.** Aestus's 55-day retention effectively caps the per-slot horizon. Older days display per-payload with a footnote. Asymmetric — censoring-only gating would let neutral-relay misses bias the headline upward. |
| 5 | Leaderboard relation to new headline | **Slot-share + footnote.** Each relay's row is "fraction of MEV-boost slots this relay delivered." Sums to ~174% across relays (slots are co-delivered); footnote names this explicitly so readers don't expect the columns to add to 100%. |
| 6 | Phase A (bloXroute fix) scope | **Fix + observability.** Lower limit to 100 (or per-relay configurable), surface per-relay health: `console.warn` each rejection with relay id + reason; persist failed-relay list in `refresh_log.message`; render a per-relay health row on `/status`. Closes the class of bug, not just this instance. |
| 7 | Public API contract on the headline field | **Add new field, repoint old gradually.** Add `perSlotCensorshipPct` to `/api/v1/summary` immediately. For ~30 days the existing `censorshipPct` keeps its per-payload semantics; the switch date is flagged on the methodology page (formerly: `/api-docs` — that page was retired after this spec was written; see `commit 69fdb8b`. The methodology page at `src/app/methodology/page.tsx` is now the canonical surface). On switch day, `censorshipPct` value (not field name) changes to per-slot; `perSlotCensorshipPct` stays as an explicit-name alias. |
| 8 | What gates the Phase E headline swap | **Full 55-day backfill + 14-day soak.** Phase D backfills every day where per-slot can be computed under the §4 rule. Phase C runs the daily ingest forward for at least 14 days alongside. Phase E only ships when both are green and per-slot tracks per-payload movement coherently (no spurious divergence; see §11). |
| — | Older days outside relay retention | **Keep showing relayscan per-payload** with an explicit footnote ("per-payload upper bound — see methodology") on chart hover and methodology page. Implied by decisions 4 + 8. |
| — | Schedule | **Daily**, same cron as `/api/refresh`. New code path runs in addition to the existing relayscan path; both write to the same `daily_stats` row. |
| — | Pagination strategy | **Walk `cursor` backwards** from the day's last slot to the day's first slot. Page size **defaults to 100** (bloXroute's max); larger pages can be opt-in per-relay later if profile suggests benefit. |

## 3. Architecture

Dual-track, additive. Both adapters write their slice of the same `daily_stats` row; neither replaces the other.

```
┌───────────────────────────────────────────────────────────┐
│ /api/refresh   (daily cron, existing route)               │
│                                                            │
│  ┌─────────────────────┐    ┌─────────────────────────┐   │
│  │ RelayscanDataSource │    │ PerSlotDataSource [new] │   │
│  │  per-relay payload  │    │  walks bidtraces per    │   │
│  │  aggregates         │    │  relay, folds per slot  │   │
│  └──────────┬──────────┘    └────────────┬────────────┘   │
│             │                              │              │
│             ▼                              ▼              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  daily_stats                                       │   │
│  │    date  censorship_pct  total_blocks    ... [old] │   │
│  │    slots_total  slots_with_censoring  per_slot_pct │   │
│  │                                                [new]│   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  slot_deliveries  [new]                            │   │
│  │    slot, block_hash, relays(JSON), date            │   │
│  │    one row per delivered slot for the UTC day      │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

`slot_deliveries` is the per-slot ground truth — kept so the daily aggregate can be rebuilt with a different attribution rule later without re-walking the bidtraces. Sized at ~7,200 rows/day × 365 ≈ 2.6M rows/yr; fits comfortably in libSQL.

## 4. Schema changes

Two changes, both additive:

```ts
// src/lib/db/schema.ts

export const dailyStats = sqliteTable("daily_stats", {
  date: text("date").primaryKey(),
  // ... existing columns unchanged ...
  totalBlocks: integer("total_blocks").notNull(),        // ← relayscan Σ num_payloads (kept)
  totalChainBlocks: integer("total_chain_blocks").notNull().default(0),

  // [new] per-slot honest fields. NULL when retention prevented a per-slot
  // pass; UI falls back to censorshipPct in that case with a footnote.
  slotsTotal: integer("slots_total"),                    // unique MEV-boost slots that day
  slotsWithCensoring: integer("slots_with_censoring"),   // slots with ≥1 censoring relay
  perSlotCensorshipPct: real("per_slot_censorship_pct"), // = slotsWithCensoring/slotsTotal × 100

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull().$defaultFn(() => new Date()),
});

// [new]
export const slotDeliveries = sqliteTable(
  "slot_deliveries",
  {
    slot: integer("slot").primaryKey(),
    blockHash: text("block_hash").notNull(),
    relays: text("relays").notNull(),     // JSON array of relayscan ids
    date: text("date").notNull(),         // UTC ISO date, indexed
  },
  (t) => [/* index on date for daily aggregate queries */],
);
```

No data migration — existing rows keep their relayscan fields and get NULL for the new columns until the backfill fills them in.

## 5. Per-slot ingest

New module: `src/lib/data-source/per-slot.ts`.

```ts
export class PerSlotDataSource {
  readonly name = "relay-bidtraces-per-slot";

  async fetchDay(date: string): Promise<PerSlotDay> {
    const [firstSlot, lastSlot] = slotsForUtcDate(date);
    const deliveries = await this.walkAllRelays(firstSlot, lastSlot);
    const bySlot = foldPayloads(deliveries);   // reuse the existing fold
    return { date, slots: bySlot };
  }

  // For each relay, page backwards from lastSlot until we cross firstSlot or
  // the relay returns empty (retention exhausted). Per-relay failures are
  // SURFACED in the result, not silently dropped (fix #1 from §1.2).
  private async walkAllRelays(firstSlot, lastSlot) { ... }
}
```

Reuses `foldPayloads` from `src/lib/epochs/ingest.ts` — the per-slot fold logic already exists and is tested.

Important behaviors:
- A relay that returns malformed data or HTTP errors logs the failure with relay id + slot range + reason, returns its partial results, and the day's row is still written but tagged with which relays failed. The audit log (`refresh_log.message`) records the failed-relay list.
- A relay whose retention has lapsed before the requested day (Aestus on a 60-day-old request) is treated as a clean "no data" — not an error. The day's row is written with the relays that did return.
- **NULL if any historical-share-≥1% relay missing.** Per-slot fields write as NULL whenever any relay holding ≥1% of recent historical share failed to return data for that day. UI falls back to relayscan with a footnote. This is **decision #4 from §2** — note the asymmetry: a missing neutral relay biases the headline upward just as a missing censoring one would, so the gate is symmetric across postures.
- The ≥1% threshold is read from the most recent 30 days of relayscan aggregates. In practice today: Ultra Sound, Titan, both bloXroute relays, Aestus, Flashbots, Agnostic. EthGas (0.81% on 2026-05-21) is below the threshold and its failure does not gate the day.

## 6. The bloXroute polling fix (Phase A — prerequisite)

**Root cause is known** (grilled & verified 2026-05-24): both bloXroute endpoints reject `?limit=200` with HTTP 400 `{"code":400,"message":"maximum limit is 100"}`. Our code hardcodes `?limit=200` at `relay-payloads.ts:37`. At `limit=100` both endpoints return 200 OK. The reason the bug went unnoticed is structural: `ingest.ts:51` only surfaces the *count* of failed relays in `IngestResult` and discards `failedRelays: string[]`, so no log, no audit row, and no `/status` indicator ever mentioned bloXroute.

The fix is small but the scope (per decision #6) extends to closing the silent-failure class, not just this instance.

### 6.1 Code fix
- Change `relay-payloads.ts:37`'s URL constant: `?limit=200` → `?limit=100`. (Validated working against both bloXroute endpoints and confirmed >100 is the only documented per-relay limit.)
- A per-relay `pageSize` override on `RelayInfo` is a reasonable forward-compat hook; default 100, opt up to 200 only for relays that explicitly support it. Out of scope to wire any individual relay up to a larger size in this phase.

### 6.2 Observability fix

Split across Phase A and Phase C because the two code paths feeding the observability story serialise differently:

**Lands in Phase A** (live epoch ledger path):
- `relay-payloads.ts`: on a per-relay rejection, emit a structured `console.warn` with `{ relayId, host, errorClass, message }`. Visible in Vercel logs and locally during dev.
- `ingest.ts`: extend `IngestResult` with `failedRelays: string[]` (not just the count). Downstream callers can persist or surface it.

**Lands in Phase C** (daily refresh path, naturally fits when `PerSlotDataSource` arrives):
- `refresh_log.message` records the `failedRelays` list as JSON for the day's run. (Phase A's relayscan-driven daily refresh has no per-relay granularity to log; `PerSlotDataSource` does by construction, so this lands when that path is wired in.)
- `/status` page gains a per-relay health table: relay id, last-success age, last-failure age, last-failure reason. Sourced from a rolling read of `refresh_log` over the last N runs.

### 6.3 Gate
Phase A ships separately. Verification:
1. After deployment, `recent_blocks` shows bloXroute records within one ingest cycle (~15s post-cron / `/api/epochs` hit).
2. Vercel logs show a structured `relay-payloads: <id> failed { ... }` line whenever a per-relay polling failure occurs (force one in a dev env to confirm).

The `/status` per-relay table and `refresh_log` persistence land with Phase C per §6.2.

No per-slot code lands until Phase A is green.

## 7. Methodology page changes

Two changes to `src/app/methodology/page.tsx`:

### §3 — Data source

Add one paragraph after the existing relayscan paragraph:

> For the per-slot honest metric, MEV Watch additionally polls each relay's `/relay/v1/data/bidtraces/proposer_payload_delivered` endpoint directly, deduplicating multi-relay deliveries to one record per slot. Relayscan's published per-payload aggregates are kept as a secondary "as relayscan.io publishes them" comparison.

### §4 — The metric

Restructure to present both numbers with a clear hierarchy:

```
Headline (per-slot, honest):
  Censorship % = slots with ≥1 censoring delivery / total MEV-boost slots

Comparison (per-payload, as published):
  relayscan % = Σ censoring deliveries / Σ all deliveries
```

State explicitly that per-payload over-counts because multi-relay delivery isn't uniform across postures, and the two numbers will not match.

## 8. Retention reality (probed 2026-05-24)

For pagination back from current slot ~14,397,988:

| Relay | Earliest slot returned | Approx age |
|---|---|---|
| `relay.ultrasound.money` | < 8,000,000 | > 3.5 yr |
| `boost-relay.flashbots.net` | < 8,000,000 | > 3.5 yr |
| `bloxroute.max-profit.blxrbdn.com` | ~ 9,000,000 | ~ 2.7 yr |
| `bloxroute.regulated.blxrbdn.com` | (not probed deeply; assume similar) | — |
| `agnostic-relay.net` | < 11,000,000 | > 1.5 yr |
| `titanrelay.xyz` | ~ 11,000,000 | ~ 1.5 yr |
| `relay.ethgas.com` | < 14,000,000 (returns data) | > 55 d |
| **`mainnet.aestus.live`** | **~ 14,000,000** | **~ 55 d only** |

Implications (sharpened by decision #4):
- For **D-0 / D-1** (the daily cron use case), every relay has the data. Per-slot works cleanly.
- For **historical backfill > 55 days**, Aestus is missing — Aestus held ~7% share on 2026-05-21 (all neutral). Under decision #4, missing Aestus means the day fails the ≥1% gate and the per-slot row writes NULL. **Per-slot effectively caps at ~55 days of history.** Older days fall back to per-payload with footnote.
- An earlier draft of this spec implied per-slot could backfill ~12 months; that was wrong on closer inspection. The asymmetric retention (censoring relays retain longer than several big neutral ones) means any deeper backfill biases the headline upward by silently dropping neutral deliveries. The grill (decision #4) explicitly rejected this.
- For **> 1.5 years ago**, Titan also drops out. Per-slot is irrecoverable for those days regardless of any future code changes — the data does not exist anywhere we can fetch it.

The probe also caught flaky behaviour from `titanrelay.xyz` returning HTML at some cursor values (parse error). The ingest must treat a non-JSON response as a per-relay failure for that page, not crash the whole walk.

## 9. In scope additions surfaced during grill

These were in earlier drafts' "out of scope" but the grill promoted them — they're load-bearing for the headline swap not contradicting the rest of the page.

### 9.1 Leaderboard rework (per decision #5)
- Switch the `/explorer` (and any homepage-embedded) relay leaderboard from per-payload share to **per-slot share** — "fraction of MEV-boost slots this relay delivered." Each slot counts once per delivering relay, so per-relay shares sum to ~174% across all relays (the multi-delivery factor). A short footnote on the leaderboard explains: *"Shares overlap because a slot can be delivered through multiple relays. The sum exceeds 100% — that's the metric working correctly, not a bug."*
- This change reads from `slot_deliveries` (decision #3) so the numbers tie back to the headline via the same dataset.
- Ships in **Phase E** alongside the headline swap; until then the leaderboard stays on per-payload to keep internal consistency with the per-payload headline.

### 9.2 Public API additive change (per decision #7)
- `/api/v1/summary` immediately grows a `perSlotCensorshipPct` field (alongside existing `censorshipPct`). Available from Phase C onward, even before the homepage swap. The field is NULL on days that didn't qualify under decision #4.
- `/api/v1/trend` adds a parallel array `perSlotPctSeries` next to its existing series.
- `/api-docs` flags a switch date 30 days after Phase E ships, on which `censorshipPct` (the *value*, not the field) repoints from per-payload to per-slot. `perSlotCensorshipPct` remains as a stable explicit-name alias.

## 10. Out of scope (this design)

- **Builder-side attribution.** Builder counts come from relayscan and are already correctly counted (one builder per block). No change.
- **A per-block on-chain inspection.** Whether a delivered block *actually contained* sanctioned txs is the next-deeper question — out of scope; the metric stays at relay-posture granularity.
- **A live per-slot metric** (the homepage hero updating every slot from per-slot data). The hero stays on daily rows; the epoch ledger already shows the per-slot story for the live window.
- **Canonical block_hash resolution.** Picking *the* winning relay per slot via Ethereum-RPC block_hash matching would replace "any-censoring" with "winner-only" semantics. Possible future refinement; deliberately out of scope here per decision #2.

## 11. Validation

**Hard regression checks** (must hold):
- **`total_blocks` continues to match `Σ relay.num_payloads`** from relayscan (relayscan path is untouched).
- **`slots_total` ≈ `total_chain_blocks` × (1 − nonBoostPct/100)`** — within a small tolerance for slot/timestamp boundary noise. A large gap means the per-slot walk missed entire chunks of slots.
- **bloXroute deliveries appear in `recent_blocks`** immediately after Phase A deploys.

**Soft consistency checks** (alert, don't fail):
- **Log both `per_slot_censorship_pct` and `censorship_pct` per day, alert on a >2× divergence in either direction.** An earlier draft asserted `per_slot ≤ per_payload` as an inviolable sanity check; that's mathematically wrong. Counter-example: 10 slots, all double-delivered — 3 slots `{Flashbots, UltraSound}`, 7 slots `{UltraSound, Titan}`. Per-payload = 3/20 = 15%; per-slot any-censoring = 3/10 = 30%. The inequality holds only when censoring relays multi-deliver *more* than neutral ones, which is empirically likely on today's relay mix but not guaranteed (two bloXroute relays from one operator dominate the censoring side; Ultra Sound + Titan dominate the neutral side — it's an empirical question which co-delivers more aggressively).

**Reference point:**
- **2026-05-21**: relayscan-as-stored reports 33.4%. Once Phase C ingests this day fresh, the per-slot number is the answer this work produces. Both numbers are kept in the row; the methodology page and `/api-docs` show both during the 30-day API back-compat window.

## 12. Migration & rollout

| Phase | Scope | Ship gate |
|---|---|---|
| **A** | bloXroute fix + observability (§6) | bloXroute rows appear in `recent_blocks`; `/status` shows per-relay health; `refresh_log.message` persists `failedRelays`. Lands and verifies green **before** any per-slot code. |
| **B** | Schema migration — additive (§4) | Drizzle migration generated and applied; existing daily_stats rows unchanged. |
| **C** | `PerSlotDataSource` wired into `/api/refresh` (§5); new fields populated from D-0 onward. `/api/v1/summary` & `/trend` add `perSlot*` fields immediately (§9.2). | Daily ingest succeeds 7 days in a row; per-slot value within the soft-consistency band (§11) every day. |
| **D** | Backfill the past ~55 days where decision #4 allows. Cursor-paged, rate-limited. Runs once, not from cron. | Every backfilled day has either a populated per-slot row or a NULL with a logged failed-relay reason. |
| **E** | Headline swap: hero + trend chart read `perSlotCensorshipPct` where present, footnote per-payload boundary. Leaderboard rework (§9.1). 14-day banner explains the methodology refinement. | **Decision #8 gate**: full 55-day backfill complete AND 14-day soak through Phase C ingest AND soft-consistency checks green on every day. |

Each phase is independently shippable and revertible. Reverting E reinstates per-payload headline by toggling a single read in the homepage data layer; the underlying per-slot columns stay populated.

## 13. Known limitations carried forward

- Per-slot only goes as far back as the binding-relay retention. With decision #4 holding the gate at ≥1% share, that's Aestus's 55 days. The trend chart reads partly per-slot, partly per-payload; the methodology page makes this explicit and the chart marks the boundary visually.
- The "any-censoring-relay-delivered" attribution rule conservatively flags a slot as censored even if the chain's actual winning block happened to be from a neutral co-delivering relay. This is intentional (decision #2) — the question we want to answer is "did this block pass through OFAC infrastructure," and the answer is yes if any censoring relay accepted it. A future refinement could resolve to the canonical winner via Ethereum-RPC block_hash matching, but the additional complexity isn't justified at the daily-aggregate granularity.
- Leaderboard relay shares do not sum to 100% under the new metric. This is correct under decision #5 (each slot can be delivered through multiple relays, and each contributing relay receives credit). A footnote names this; readers expecting a clean 100% partition will need that flagged.
- The soft-consistency band (per-slot vs per-payload divergence) is not a guarantee, only an alert (see §11). The two numbers can diverge in either direction depending on how multi-delivery is distributed across postures.
