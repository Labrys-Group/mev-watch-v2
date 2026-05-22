# Censorship Data Accuracy Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make v2's censorship history match mevwatch.info, and replace the inaccurate relayscan-based daily pipeline with a per-block deduplicated one.

**Architecture:** Two phases. **Phase 1** backfills `daily_stats` from mevwatch.info's own `/api/blockStatsAggregated` (the only complete, correct, deduplicated history — Labrys owns it). **Phase 2** replaces the forward daily refresh: instead of relayscan's multi-counted `num_payloads`, it queries each relay's `proposer_payload_delivered` bidtrace API, deduplicates to one relay per slot, and computes the metric from real block counts — the same method mevwatch v1 uses.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM + libSQL, Vitest, zod, `tsx` scripts, pnpm.

---

## Background: why the data is wrong

`src/lib/metrics.ts` computes censorship as `sum(num_payloads of censoring relays) / sum(num_payloads of all relays)`, reading relayscan.io's `/stats/day` API. relayscan's `num_payloads` **multi-counts**: a block delivered via N relays is counted once per relay, and the inflation factor is wildly different per relay (on 2024-06-15: Ultra Sound 1.01×, Agnostic 19×, bloXroute Max Profit 4.8×). The ratio does **not** cancel the double-counting because it is asymmetric. Result: v2's history drifts 3-14 points from mevwatch.info, both directions.

mevwatch.info v1 (still live on the `labrys/dev` branch, Mongo-backed) does it correctly: it pulls each relay's `proposer_payload_delivered`, stores one row per slot with a **globally unique `slotNumber`** (`packages/database/src/models/BlockStats.ts`), so each block is attributed to exactly one relay. Its `/api/blockStatsAggregated` exposes the deduplicated result as 12-hour windows with `censoringBlocks` / `nonCensoringBlocks` / per-relay `relayerStats`.

## Methodology decisions (locked)

- **Headline metric** = `censoringBlocks / (censoringBlocks + nonCensoringBlocks) × 100` — censoring share of MEV-boost blocks. Matches mevwatch.info's default headline and v2's existing "distribution of MEV-boost blocks" framing in `src/components/sections/composition.tsx`. No UI changes needed.
- **`daily_stats` columns:** `censorshipPct` (of MEV-boost), `neutralPct = 100 − censorshipPct`, `nonBoostPct = (totalSlots − censoring − nonCensoring) / totalSlots × 100`, `totalBlocks = censoring + nonCensoring` (the MEV-boost block count).
- **Window→day mapping:** mevwatch's 12h windows end at ~06:42 and ~18:42 UTC (not calendar-aligned). Group the two windows whose `ts` falls on calendar day D into day D. This is a stable, reproducible ~5h phase offset, invisible on a 1,345-point trend chart.
- **Scope:** Phase 1 backfills `daily_stats` only. `relay_daily_stats` and `builder_daily_stats` historical rows are relayscan-derived and only feed the *latest-day* leaderboard, which the Phase 2 forward pipeline overwrites daily after cutover. Historical per-relay/builder rows are not displayed anywhere; leaving them is acceptable and keeps Phase 1 low-risk.
- **Forward dedup tie-break:** when a slot appears in multiple relays' `proposer_payload_delivered`, attribute it to one relay by a fixed priority order (`priority` field on each relay). v1 used relayer-array insertion order; the exact order is a tunable parameter validated empirically in Task 12 against mevwatch's last 30 days.

---

# PHASE 1 — Backfill `daily_stats` from mevwatch.info

## Task 1: Shared `dayStatsFromCounts` helper

A pure function converting raw block counts into the four `daily_stats` percentage/total fields. Used by both the Phase 1 backfill and the Phase 2 forward pipeline, so the formula lives in exactly one place.

**Files:**
- Modify: `src/lib/metrics.ts`
- Test: `src/lib/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/metrics.test.ts` (create the file if it does not exist; if it exists, append the `describe` block and add the import):

```typescript
import { describe, it, expect } from "vitest";
import { dayStatsFromCounts } from "./metrics";

describe("dayStatsFromCounts", () => {
  it("computes censorship as the censoring share of MEV-boost blocks", () => {
    const r = dayStatsFromCounts(2369, 4192, 7200);
    expect(r.censorshipPct).toBeCloseTo(36.11, 1);
    expect(r.neutralPct).toBeCloseTo(63.89, 1);
    expect(r.totalBlocks).toBe(6561);
  });

  it("computes non-boost share against total slots", () => {
    const r = dayStatsFromCounts(2369, 4192, 7200);
    // (7200 - 2369 - 4192) / 7200
    expect(r.nonBoostPct).toBeCloseTo(8.875, 2);
  });

  it("returns all zeros when there are no MEV-boost blocks", () => {
    expect(dayStatsFromCounts(0, 0, 7200)).toEqual({
      censorshipPct: 0,
      neutralPct: 0,
      nonBoostPct: 0,
      totalBlocks: 0,
    });
  });

  it("clamps non-boost to 0 when counts exceed the slot total", () => {
    // mevwatch hardcodes 3600 slots/window; missed slots can make counts exceed it.
    const r = dayStatsFromCounts(4000, 4000, 7200);
    expect(r.nonBoostPct).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/metrics.test.ts`
Expected: FAIL — `dayStatsFromCounts is not a function`.

- [ ] **Step 3: Implement the helper**

Add to `src/lib/metrics.ts`, after the `DailyStatsResult` interface:

```typescript
/**
 * Convert raw block counts into the four `daily_stats` fields.
 *
 * `censorshipPct` is the censoring share of MEV-boost blocks (matches
 * mevwatch.info's headline); `nonBoostPct` is the locally-built share of *all*
 * slots. The single source of truth for the day-stats formula — used by both
 * the mevwatch backfill and the forward bidtrace pipeline.
 */
export function dayStatsFromCounts(
  censoringBlocks: number,
  nonCensoringBlocks: number,
  totalSlots: number,
): DailyStatsResult {
  const mevBoost = censoringBlocks + nonCensoringBlocks;
  if (mevBoost === 0) {
    return { censorshipPct: 0, neutralPct: 0, nonBoostPct: 0, totalBlocks: 0 };
  }
  const censorshipPct = (censoringBlocks / mevBoost) * 100;
  const nonBoost = Math.max(0, totalSlots - mevBoost);
  return {
    censorshipPct,
    neutralPct: 100 - censorshipPct,
    nonBoostPct: totalSlots > 0 ? (nonBoost / totalSlots) * 100 : 0,
    totalBlocks: mevBoost,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts
git commit -m "feat: add dayStatsFromCounts — shared day-stats formula"
```

---

## Task 2: mevwatch.info API client + window→day aggregation

Fetch `/api/blockStatsAggregated`, validate it with zod, and aggregate the 12-hour windows into calendar days.

**Files:**
- Create: `src/lib/data-source/mevwatch.ts`
- Test: `src/lib/data-source/mevwatch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-source/mevwatch.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchMevwatchWindows, aggregateWindowsToDays } from "./mevwatch";

const WINDOWS = [
  {
    date: "2024-06-15T06:42:59.000Z",
    totalBlocks: 3600,
    censoringBlocks: 1192,
    nonCensoringBlocks: 2084,
    relayerStats: [
      { name: "Flashbots", numBlocks: 114, isOfacCensoring: true },
      { name: "Ultra Sound Money", numBlocks: 2004, isOfacCensoring: false },
    ],
  },
  {
    date: "2024-06-15T18:42:59.000Z",
    totalBlocks: 3600,
    censoringBlocks: 1177,
    nonCensoringBlocks: 2108,
    relayerStats: [
      { name: "Flashbots", numBlocks: 125, isOfacCensoring: true },
      { name: "Ultra Sound Money", numBlocks: 2042, isOfacCensoring: false },
    ],
  },
  {
    date: "2024-06-16T06:42:59.000Z",
    totalBlocks: 3600,
    censoringBlocks: 1000,
    nonCensoringBlocks: 2200,
    relayerStats: [],
  },
];

afterEach(() => vi.restoreAllMocks());

describe("aggregateWindowsToDays", () => {
  it("sums the windows that share a calendar day", () => {
    const days = aggregateWindowsToDays(WINDOWS);
    const d = days.find((x) => x.date === "2024-06-15")!;
    expect(d.censoringBlocks).toBe(2369);
    expect(d.nonCensoringBlocks).toBe(4192);
    expect(d.totalSlots).toBe(7200);
  });

  it("emits one entry per calendar day, sorted ascending", () => {
    const days = aggregateWindowsToDays(WINDOWS);
    expect(days.map((d) => d.date)).toEqual(["2024-06-15", "2024-06-16"]);
  });
});

describe("fetchMevwatchWindows", () => {
  it("fetches and parses the aggregated stats endpoint", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ relayStats: WINDOWS }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const windows = await fetchMevwatchWindows();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.mevwatch.info/api/blockStatsAggregated",
      expect.any(Object),
    );
    expect(windows).toHaveLength(3);
    expect(windows[0].censoringBlocks).toBe(1192);
  });

  it("throws on a non-OK HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 502 })));
    await expect(fetchMevwatchWindows()).rejects.toThrow(/mevwatch/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/data-source/mevwatch.test.ts`
Expected: FAIL — module `./mevwatch` not found.

- [ ] **Step 3: Implement the client**

Create `src/lib/data-source/mevwatch.ts`:

```typescript
import { z } from "zod";

/**
 * One-time backfill source: mevwatch.info v1's own `/api/blockStatsAggregated`.
 *
 * v1 stores one row per slot under a globally-unique `slotNumber`, so each
 * block is already attributed to exactly one relay — this is the deduplicated,
 * correct history. We import it once; the forward pipeline (Phase 2) takes
 * over for new days and does not depend on this endpoint.
 */

const WindowSchema = z.object({
  date: z.string(),
  totalBlocks: z.number(),
  censoringBlocks: z.number(),
  nonCensoringBlocks: z.number(),
  relayerStats: z.array(
    z.object({
      name: z.string(),
      numBlocks: z.number(),
      isOfacCensoring: z.boolean(),
    }),
  ),
});
const ResponseSchema = z.object({ relayStats: z.array(WindowSchema) });

/** One 12-hour aggregation window as returned by mevwatch.info. */
export type MevwatchWindow = z.infer<typeof WindowSchema>;

/** Censoring/non-censoring block counts aggregated to one calendar day. */
export interface MevwatchDay {
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  censoringBlocks: number;
  nonCensoringBlocks: number;
  /** Total slots in the day's windows (mevwatch reports 3600 per window). */
  totalSlots: number;
}

const ENDPOINT = "https://www.mevwatch.info/api/blockStatsAggregated";

/** Fetch every 12-hour window mevwatch.info has recorded since the Merge. */
export async function fetchMevwatchWindows(): Promise<MevwatchWindow[]> {
  const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`mevwatch request failed: HTTP ${res.status}`);
  }
  return ResponseSchema.parse(await res.json()).relayStats;
}

/**
 * Collapse 12-hour windows into calendar days. mevwatch's windows end at
 * ~06:42 and ~18:42 UTC; both windows whose `ts` lands on day D fold into D.
 */
export function aggregateWindowsToDays(
  windows: MevwatchWindow[],
): MevwatchDay[] {
  const byDay = new Map<string, MevwatchDay>();
  for (const w of windows) {
    const date = w.date.slice(0, 10);
    const day =
      byDay.get(date) ??
      { date, censoringBlocks: 0, nonCensoringBlocks: 0, totalSlots: 0 };
    day.censoringBlocks += w.censoringBlocks;
    day.nonCensoringBlocks += w.nonCensoringBlocks;
    day.totalSlots += w.totalBlocks;
    byDay.set(date, day);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/data-source/mevwatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-source/mevwatch.ts src/lib/data-source/mevwatch.test.ts
git commit -m "feat: add mevwatch.info backfill client + window aggregation"
```

---

## Task 3: Backfill script

A one-off `tsx` script: fetch → aggregate → upsert every day into `daily_stats`, then write one `refresh_log` entry.

**Files:**
- Create: `scripts/backfill-from-mevwatch.ts`
- Modify: `package.json` (scripts section)

- [ ] **Step 1: Write the script**

Create `scripts/backfill-from-mevwatch.ts`:

```typescript
import "dotenv/config";
import { db } from "../src/lib/db";
import { dailyStats, refreshLog } from "../src/lib/db/schema";
import { dayStatsFromCounts } from "../src/lib/metrics";
import {
  fetchMevwatchWindows,
  aggregateWindowsToDays,
} from "../src/lib/data-source/mevwatch";

/**
 * One-time backfill of `daily_stats` from mevwatch.info's deduplicated
 * history. Idempotent — re-running overwrites each day's row.
 */
async function main() {
  console.log("Fetching mevwatch.info aggregated history...");
  const windows = await fetchMevwatchWindows();
  const days = aggregateWindowsToDays(windows);
  console.log(`Got ${windows.length} windows -> ${days.length} days.`);

  let written = 0;
  for (const day of days) {
    const stats = dayStatsFromCounts(
      day.censoringBlocks,
      day.nonCensoringBlocks,
      day.totalSlots,
    );
    await db
      .insert(dailyStats)
      .values({
        date: day.date,
        censorshipPct: stats.censorshipPct,
        neutralPct: stats.neutralPct,
        nonBoostPct: stats.nonBoostPct,
        totalBlocks: stats.totalBlocks,
      })
      .onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          censorshipPct: stats.censorshipPct,
          neutralPct: stats.neutralPct,
          nonBoostPct: stats.nonBoostPct,
          totalBlocks: stats.totalBlocks,
        },
      });
    written += 1;
  }

  await db.insert(refreshLog).values({
    status: "ok",
    source: "mevwatch.info backfill",
    message: `Backfilled ${written} days (${days[0]?.date} -> ${days[days.length - 1]?.date})`,
  });

  console.log(`Backfill complete — ${written} days written.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the package.json script**

In `package.json`, add to the `scripts` object (next to `seed-history`):

```json
    "backfill-mevwatch": "tsx scripts/backfill-from-mevwatch.ts",
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-from-mevwatch.ts package.json
git commit -m "feat: add mevwatch.info backfill script"
```

---

## Task 4: Run the backfill and verify

- [ ] **Step 1: Back up the current database**

```bash
cp data/*.db "data/backup-before-backfill-$(date +%Y%m%d).db"
```

Expected: a backup file appears in `data/`.

- [ ] **Step 2: Run the backfill**

Run: `pnpm backfill-mevwatch`
Expected: `Backfill complete — ~1345 days written.`

- [ ] **Step 3: Verify the row count and a spot value**

Run: `pnpm db:summary`
Expected: `daily_stats rows: ~1345`, date range starting `2022-09-15`.

Then spot-check three days against mevwatch.info's API:

```bash
node -e '
const want = { "2024-06-15": 36.1, "2023-06-15": 33.9, "2025-12-15": 21.7 };
fetch("https://www.mevwatch.info/api/blockStatsAggregated").then(r=>r.json()).then(j=>{
  const days={};
  for(const w of j.relayStats){const d=w.date.slice(0,10);(days[d]=days[d]||{c:0,n:0});days[d].c+=w.censoringBlocks;days[d].n+=w.nonCensoringBlocks;}
  for(const [d,exp] of Object.entries(want)){const x=days[d];console.log(d,"mevwatch=",(x.c/(x.c+x.n)*100).toFixed(1),"expected~",exp);}
});'
```

Then compare to v2's stored values:

```bash
npx tsx -e '
import "dotenv/config";
import { db } from "./src/lib/db";
import { dailyStats } from "./src/lib/db/schema";
import { inArray } from "drizzle-orm";
const rows = await db.select().from(dailyStats).where(inArray(dailyStats.date,["2024-06-15","2023-06-15","2025-12-15"]));
for (const r of rows) console.log(r.date, "v2 censorshipPct=", r.censorshipPct.toFixed(1));
process.exit(0);'
```

Expected: v2's `censorshipPct` for each day is within **0.5 points** of mevwatch's value (small residual from the window→day phase offset).

- [ ] **Step 4: Verify the site renders**

Run: `pnpm dev`, open `http://localhost:3000`. Confirm the trend chart and hero verdict render without error and the headline number is plausible (high in 2022-2023, lower in 2025-2026).

- [ ] **Step 5: Commit the verification note**

No code changed in this task. If a `data/` file is tracked, do **not** commit the DB. Phase 1 is complete and shippable here.

```bash
git status   # confirm only the (gitignored) DB changed; nothing to commit
```

---

# PHASE 2 — Forward per-block pipeline

After Phase 1, history is correct but the daily cron still runs the wrong relayscan pipeline. Phase 2 replaces it with a per-block deduplicated pipeline that produces numbers consistent with the backfilled history.

## Task 5: `daySlotRange` chain-time helper

The forward pipeline fetches one calendar day of blocks; it needs that day's beacon-slot range.

**Files:**
- Modify: `src/lib/epochs/chain-time.ts`
- Test: `src/lib/epochs/chain-time.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/epochs/chain-time.test.ts` (create the file with the import if it does not exist):

```typescript
import { describe, it, expect } from "vitest";
import { daySlotRange, GENESIS_TIME, SECONDS_PER_SLOT } from "./chain-time";

describe("daySlotRange", () => {
  it("returns the inclusive first/last slot of a UTC calendar day", () => {
    const { first, last } = daySlotRange("2024-06-15");
    const firstTs = GENESIS_TIME + first * SECONDS_PER_SLOT;
    const lastTs = GENESIS_TIME + last * SECONDS_PER_SLOT;
    expect(new Date(firstTs * 1000).toISOString()).toBe("2024-06-15T00:00:11.000Z");
    expect(new Date((lastTs + SECONDS_PER_SLOT) * 1000).toISOString()).toBe(
      "2024-06-16T00:00:11.000Z",
    );
  });

  it("spans exactly 7200 slots", () => {
    const { first, last } = daySlotRange("2024-06-15");
    expect(last - first + 1).toBe(7200);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/chain-time.test.ts`
Expected: FAIL — `daySlotRange is not a function`.

- [ ] **Step 3: Implement the helper**

Add to `src/lib/epochs/chain-time.ts`:

```typescript
/**
 * The inclusive [first, last] beacon-slot range covering a UTC calendar day.
 * `date` is an ISO `YYYY-MM-DD` string. The first slot is the earliest slot
 * whose timestamp is >= 00:00:00 UTC that day.
 */
export function daySlotRange(date: string): { first: number; last: number } {
  const startMs = Date.parse(`${date}T00:00:00Z`);
  const endMs = startMs + 24 * 60 * 60 * 1000;
  const first = Math.ceil(
    (Math.floor(startMs / 1000) - GENESIS_TIME) / SECONDS_PER_SLOT,
  );
  const last =
    Math.ceil((Math.floor(endMs / 1000) - GENESIS_TIME) / SECONDS_PER_SLOT) - 1;
  return { first, last };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/chain-time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/chain-time.ts src/lib/epochs/chain-time.test.ts
git commit -m "feat: add daySlotRange beacon-time helper"
```

---

## Task 6: Relay tie-break priority config

When a slot appears in several relays' `proposer_payload_delivered`, the forward pipeline attributes it to one relay by a fixed priority order. Add a `priority` to each relay and a lookup.

**Files:**
- Modify: `src/config/relays.ts`
- Test: `src/config/relays.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/config/relays.test.ts`:

```typescript
import { relayPriority } from "./relays";

describe("relayPriority", () => {
  it("orders censoring relays ahead of Ultra Sound (matches mevwatch v1)", () => {
    expect(relayPriority("bloxroute.regulated.blxrbdn.com")).toBeLessThan(
      relayPriority("relay.ultrasound.money"),
    );
  });

  it("gives unconfigured relays the lowest priority", () => {
    expect(relayPriority("some.unknown.relay")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("assigns a distinct priority to every configured relay", () => {
    const ids = [
      "bloxroute.max-profit.blxrbdn.com",
      "bloxroute.regulated.blxrbdn.com",
      "boost-relay.flashbots.net",
      "relay.ultrasound.money",
      "titanrelay.xyz",
      "agnostic-relay.net",
      "aestus.live",
      "relay.ethgas.com",
    ];
    const prios = ids.map(relayPriority);
    expect(new Set(prios).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/config/relays.test.ts`
Expected: FAIL — `relayPriority is not a function`.

- [ ] **Step 3: Implement the priority order**

Add to `src/config/relays.ts`, after the `classifyRelay` function:

```typescript
/**
 * Tie-break order for attributing a multi-relay slot to one relay (Phase 2
 * forward pipeline). A slot reported by several relays is credited to the one
 * with the lowest priority number.
 *
 * Seeded from mevwatch v1's relayer-array order (censoring relays ahead of
 * Ultra Sound), which is the order that produced the historical numbers.
 * Tuned empirically against mevwatch's recent days — see the validation task.
 */
const TIE_BREAK_ORDER: string[] = [
  "bloxroute.max-profit.blxrbdn.com",
  "bloxroute.regulated.blxrbdn.com",
  "relay.edennetwork.io",
  "mainnet-relay.securerpc.com",
  "boost-relay.flashbots.net",
  "builder-relay-mainnet.blocknative.com",
  "relay.ultrasound.money",
  "agnostic-relay.net",
  "aestus.live",
  "titanrelay.xyz",
  "relay.ethgas.com",
  "relay.wenmerge.com",
];

const priorityById = new Map(TIE_BREAK_ORDER.map((id, i) => [id, i]));

/**
 * Tie-break priority for a relay id — lower wins. Unconfigured relays sort
 * last so a newly-seen relay never silently steals a slot.
 */
export function relayPriority(id: string): number {
  return priorityById.get(id) ?? Number.MAX_SAFE_INTEGER;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/config/relays.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/relays.ts src/config/relays.test.ts
git commit -m "feat: add relay tie-break priority for per-block attribution"
```

---

## Task 7: `attributeBlocks` — deduplicate payloads to one relay per slot

The core of the correct methodology. Given every relay's delivered payloads, fold to one block per slot, attributing each to its highest-priority relay.

**Files:**
- Create: `src/lib/data-source/attribute.ts`
- Test: `src/lib/data-source/attribute.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-source/attribute.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { attributeBlocks } from "./attribute";
import type { DeliveredPayload } from "../epochs/relay-payloads";

function payload(
  slot: number,
  relayId: string,
  builderPubkey = "0xbuilder",
): DeliveredPayload {
  return {
    slot,
    blockHash: `0xhash${slot}`,
    builderPubkey,
    valueWei: "1",
    numTx: 10,
    blockNumber: slot + 1000,
    relayId,
  };
}

describe("attributeBlocks", () => {
  it("counts each slot once, crediting the highest-priority relay", () => {
    // Slot 1 reported by a censoring relay (priority 1) and Ultra Sound (7).
    const result = attributeBlocks([
      payload(1, "bloxroute.regulated.blxrbdn.com"),
      payload(1, "relay.ultrasound.money"),
      payload(2, "relay.ultrasound.money"),
    ]);
    expect(result.relayCounts.get("bloxroute.regulated.blxrbdn.com")).toBe(1);
    expect(result.relayCounts.get("relay.ultrasound.money")).toBe(1);
    expect(result.totalBlocks).toBe(2);
  });

  it("tallies builders from the winning relay's payload", () => {
    const result = attributeBlocks([
      payload(1, "relay.ultrasound.money", "0xA"),
      payload(2, "relay.ultrasound.money", "0xB"),
      payload(3, "relay.ultrasound.money", "0xA"),
    ]);
    expect(result.builderCounts.get("0xA")).toBe(2);
    expect(result.builderCounts.get("0xB")).toBe(1);
  });

  it("handles an empty input", () => {
    const result = attributeBlocks([]);
    expect(result.totalBlocks).toBe(0);
    expect(result.relayCounts.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/data-source/attribute.test.ts`
Expected: FAIL — module `./attribute` not found.

- [ ] **Step 3: Implement `attributeBlocks`**

Create `src/lib/data-source/attribute.ts`:

```typescript
import { relayPriority } from "@/config/relays";
import type { DeliveredPayload } from "../epochs/relay-payloads";

/** Deduplicated per-slot attribution result for one day. */
export interface AttributionResult {
  /** Winning-relay id -> count of slots credited to it. */
  relayCounts: Map<string, number>;
  /** Builder pubkey -> count of slots credited to it. */
  builderCounts: Map<string, number>;
  /** Distinct slots seen (the MEV-boost block count). */
  totalBlocks: number;
}

/**
 * Fold every relay's delivered payloads into one block per slot.
 *
 * A block delivered through several relays appears once per relay in the raw
 * data; we credit it to the single highest-priority relay (see `relayPriority`)
 * so each slot is counted exactly once — the same deduplication mevwatch v1
 * does with its globally-unique `slotNumber`.
 */
export function attributeBlocks(
  payloads: DeliveredPayload[],
): AttributionResult {
  const winnerBySlot = new Map<number, DeliveredPayload>();
  for (const p of payloads) {
    const current = winnerBySlot.get(p.slot);
    if (!current || relayPriority(p.relayId) < relayPriority(current.relayId)) {
      winnerBySlot.set(p.slot, p);
    }
  }

  const relayCounts = new Map<string, number>();
  const builderCounts = new Map<string, number>();
  for (const p of winnerBySlot.values()) {
    relayCounts.set(p.relayId, (relayCounts.get(p.relayId) ?? 0) + 1);
    builderCounts.set(
      p.builderPubkey,
      (builderCounts.get(p.builderPubkey) ?? 0) + 1,
    );
  }

  return { relayCounts, builderCounts, totalBlocks: winnerBySlot.size };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/data-source/attribute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-source/attribute.ts src/lib/data-source/attribute.test.ts
git commit -m "feat: add attributeBlocks — per-slot payload deduplication"
```

---

## Task 8: Fetch one relay's full day of delivered payloads

`RelayPayloadSource` (`src/lib/epochs/relay-payloads.ts`) fetches only the latest 200 payloads. The forward pipeline needs a full day, so it must paginate by `cursor`.

**Files:**
- Create: `src/lib/data-source/relay-day-fetch.ts`
- Test: `src/lib/data-source/relay-day-fetch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-source/relay-day-fetch.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRelayDay } from "./relay-day-fetch";

afterEach(() => vi.restoreAllMocks());

function row(slot: number) {
  return {
    slot: String(slot),
    block_hash: `0x${slot}`,
    builder_pubkey: "0xb",
    value: "1",
    num_tx: 5,
    block_number: slot + 1,
  };
}

describe("fetchRelayDay", () => {
  it("pages downward by cursor and keeps only slots in range", async () => {
    // Range 100..109. Page 1: slots 109-102, page 2: slots 101-94.
    const pages = [
      [109, 108, 107, 106, 105, 104, 103, 102].map(row),
      [101, 100, 99, 98, 97, 96, 95, 94].map(row),
    ];
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(pages[call++] ?? []), { status: 200 })),
    );

    const got = await fetchRelayDay("relay.example", "relay.example", 100, 109);

    expect(got.map((p) => p.slot).sort((a, b) => a - b)).toEqual([
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    ]);
    expect(got[0].relayId).toBe("relay.example");
  });

  it("stops and throws if the relay ignores the cursor (no progress)", async () => {
    // Always returns the same newest page — paging makes no downward progress.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([row(500), row(499)]), { status: 200 })),
    );
    await expect(
      fetchRelayDay("relay.stuck", "relay.stuck", 100, 109),
    ).rejects.toThrow(/cursor/i);
  });

  it("throws on a non-OK HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    await expect(
      fetchRelayDay("relay.example", "relay.example", 100, 109),
    ).rejects.toThrow(/HTTP 500/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/data-source/relay-day-fetch.test.ts`
Expected: FAIL — module `./relay-day-fetch` not found.

- [ ] **Step 3: Implement `fetchRelayDay`**

Create `src/lib/data-source/relay-day-fetch.ts`:

```typescript
import { z } from "zod";
import type { DeliveredPayload } from "../epochs/relay-payloads";

const RowSchema = z.object({
  slot: z.coerce.number(),
  block_hash: z.string(),
  builder_pubkey: z.string(),
  value: z.string(),
  num_tx: z.coerce.number(),
  block_number: z.coerce.number(),
});
const PageSchema = z.array(RowSchema);

const ENDPOINT = "/relay/v1/data/bidtraces/proposer_payload_delivered";
const PAGE_LIMIT = 200;
/** A day is 7200 slots; ~40 pages per relay. Cap well above that. */
const MAX_PAGES = 120;

/**
 * Fetch every payload a relay delivered for the inclusive slot range
 * [firstSlot, lastSlot], paging the bidtrace API downward by `cursor`.
 *
 * Each page re-queries with `cursor` set to the lowest slot seen so far.
 * If a page makes no downward progress (the relay ignored the cursor), throws
 * so a silently-truncated day is never mistaken for a complete one. The
 * boundary slot may repeat across pages; `seen` keeps the output unique.
 */
export async function fetchRelayDay(
  host: string,
  relayId: string,
  firstSlot: number,
  lastSlot: number,
): Promise<DeliveredPayload[]> {
  const out: DeliveredPayload[] = [];
  const seen = new Set<number>();
  let cursor = lastSlot + 1;
  let prevMinSlot = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url =
      `https://${host}${ENDPOINT}` +
      `?order_by=-slot&limit=${PAGE_LIMIT}&cursor=${cursor}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${relayId}: HTTP ${res.status}`);

    const rows = PageSchema.parse(await res.json());
    if (rows.length === 0) break;

    const minSlot = Math.min(...rows.map((r) => r.slot));
    if (minSlot >= prevMinSlot) {
      throw new Error(
        `${relayId}: relay ignores cursor (no progress past slot ${minSlot})`,
      );
    }
    prevMinSlot = minSlot;

    for (const r of rows) {
      if (r.slot >= firstSlot && r.slot <= lastSlot && !seen.has(r.slot)) {
        seen.add(r.slot);
        out.push({
          slot: r.slot,
          blockHash: r.block_hash,
          builderPubkey: r.builder_pubkey,
          valueWei: r.value,
          numTx: r.num_tx,
          blockNumber: r.block_number,
          relayId,
        });
      }
    }

    if (minSlot <= firstSlot) break;
    cursor = minSlot;
  }

  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/data-source/relay-day-fetch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-source/relay-day-fetch.ts src/lib/data-source/relay-day-fetch.test.ts
git commit -m "feat: add fetchRelayDay — paginated relay bidtrace fetch"
```

---

## Task 9: `BidtraceDataSource` — the forward `DataSource`

A `DataSource` that fetches all relays' delivered payloads for a day, deduplicates them, and returns the existing `DayRelayStats` shape (now with deduplicated counts) plus a `totalSlots` field.

**Files:**
- Modify: `src/lib/data-source/types.ts` (add `totalSlots`)
- Create: `src/lib/data-source/bidtrace.ts`
- Test: `src/lib/data-source/bidtrace.test.ts`

- [ ] **Step 1: Add `totalSlots` to `DayRelayStats`**

In `src/lib/data-source/types.ts`, add the optional field to `DayRelayStats`:

```typescript
/** One day of relay statistics from the external source. */
export interface DayRelayStats {
  /** ISO date, e.g. "2026-05-20". */
  date: string;
  relays: RelayPayloadCount[];
  builders: BuilderBlockCount[];
  /**
   * Total beacon slots in the day. Set by the per-block pipeline so non-MEV-
   * boost share can be derived; omitted by aggregate sources (relayscan).
   */
  totalSlots?: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/data-source/bidtrace.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { BidtraceDataSource } from "./bidtrace";
import type { DeliveredPayload } from "../epochs/relay-payloads";

afterEach(() => vi.restoreAllMocks());

describe("BidtraceDataSource", () => {
  it("returns deduplicated per-relay counts for the day", async () => {
    const fake = {
      async fetchDayDeliveries(): Promise<DeliveredPayload[]> {
        return [
          // slot 1: censoring relay wins over Ultra Sound
          mk(1, "bloxroute.regulated.blxrbdn.com"),
          mk(1, "relay.ultrasound.money"),
          mk(2, "relay.ultrasound.money"),
          mk(3, "relay.ultrasound.money"),
        ];
      },
    };
    const source = new BidtraceDataSource(fake);
    const day = await source.fetchDay("2026-05-20");

    expect(day.date).toBe("2026-05-20");
    const counts = Object.fromEntries(
      day.relays.map((r) => [r.relayId, r.numPayloads]),
    );
    expect(counts["bloxroute.regulated.blxrbdn.com"]).toBe(1);
    expect(counts["relay.ultrasound.money"]).toBe(2);
    expect(day.totalSlots).toBe(7200);
  });

  it("has the provider name 'relay bidtrace'", () => {
    expect(new BidtraceDataSource({ async fetchDayDeliveries() { return []; } }).name)
      .toBe("relay bidtrace");
  });
});

function mk(slot: number, relayId: string): DeliveredPayload {
  return {
    slot,
    blockHash: `0x${slot}`,
    builderPubkey: "0xb",
    valueWei: "1",
    numTx: 5,
    blockNumber: slot + 1,
    relayId,
  };
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test -- src/lib/data-source/bidtrace.test.ts`
Expected: FAIL — module `./bidtrace` not found.

- [ ] **Step 4: Implement `BidtraceDataSource`**

Create `src/lib/data-source/bidtrace.ts`:

```typescript
import { RELAYS } from "@/config/relays";
import { daySlotRange } from "../epochs/chain-time";
import type { DeliveredPayload } from "../epochs/relay-payloads";
import { fetchRelayDay } from "./relay-day-fetch";
import { attributeBlocks } from "./attribute";
import type { DataSource, DayRelayStats } from "./types";

const SLOTS_PER_DAY = 7200;

/** Supplies one day of delivered payloads — real relays, or a test fake. */
export interface DayDeliverySource {
  fetchDayDeliveries(date: string): Promise<DeliveredPayload[]>;
}

/** Fetches a day from every configured relay's bidtrace API. */
class RelayDayDeliverySource implements DayDeliverySource {
  async fetchDayDeliveries(date: string): Promise<DeliveredPayload[]> {
    const { first, last } = daySlotRange(date);
    const settled = await Promise.allSettled(
      RELAYS.map((r) => fetchRelayDay(r.dataApiHost, r.id, first, last)),
    );
    const payloads: DeliveredPayload[] = [];
    const failed: string[] = [];
    settled.forEach((res, i) => {
      if (res.status === "fulfilled") payloads.push(...res.value);
      else failed.push(RELAYS[i].id);
    });
    if (failed.length > 0) {
      // A missing relay would silently undercount — fail loudly instead.
      throw new Error(`relay fetch failed: ${failed.join(", ")}`);
    }
    return payloads;
  }
}

/**
 * Per-block `DataSource`: queries each relay's `proposer_payload_delivered`,
 * deduplicates to one relay per slot, and reports real (not multi-counted)
 * block counts. Replaces `RelayscanDataSource` for the daily refresh.
 */
export class BidtraceDataSource implements DataSource {
  readonly name = "relay bidtrace";

  constructor(
    private readonly deliveries: DayDeliverySource = new RelayDayDeliverySource(),
  ) {}

  async fetchDay(date: string): Promise<DayRelayStats> {
    const payloads = await this.deliveries.fetchDayDeliveries(date);
    const { relayCounts, builderCounts } = attributeBlocks(payloads);

    return {
      date,
      relays: [...relayCounts].map(([relayId, numPayloads]) => ({
        relayId,
        numPayloads,
      })),
      builders: [...builderCounts].map(([builderId, numBlocks]) => ({
        builderId,
        numBlocks,
      })),
      totalSlots: SLOTS_PER_DAY,
    };
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test -- src/lib/data-source/bidtrace.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data-source/types.ts src/lib/data-source/bidtrace.ts src/lib/data-source/bidtrace.test.ts
git commit -m "feat: add BidtraceDataSource — per-block forward data source"
```

---

## Task 10: Compute day stats from deduplicated counts

`computeDailyStats` (`src/lib/metrics.ts`) currently computes `censoring / totalDeliveries` and hardcodes `nonBoostPct: 0`. Rewrite it to use the `dayStatsFromCounts` helper and the new `totalSlots`.

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/refresh/persist.ts`
- Test: `src/lib/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/metrics.test.ts`. Merge `computeDailyStats` into the existing `./metrics` import line from Task 1 (avoid a duplicate-import lint error); add the `RelayPayloadCount` type import:

```typescript
import type { RelayPayloadCount } from "./data-source/types";

describe("computeDailyStats with deduplicated counts", () => {
  const relays: RelayPayloadCount[] = [
    { relayId: "boost-relay.flashbots.net", numPayloads: 2369 }, // censoring
    { relayId: "relay.ultrasound.money", numPayloads: 4192 }, // neutral
  ];

  it("computes censorship as the censoring share of MEV-boost blocks", () => {
    const r = computeDailyStats(relays, "2024-06-15", 7200);
    expect(r.censorshipPct).toBeCloseTo(36.11, 1);
    expect(r.totalBlocks).toBe(6561);
  });

  it("derives non-boost share from totalSlots when provided", () => {
    const r = computeDailyStats(relays, "2024-06-15", 7200);
    expect(r.nonBoostPct).toBeCloseTo(8.875, 2);
  });

  it("reports zero non-boost when totalSlots is omitted", () => {
    const r = computeDailyStats(relays, "2024-06-15");
    expect(r.nonBoostPct).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/metrics.test.ts`
Expected: FAIL — `computeDailyStats` ignores the third argument / `nonBoostPct` is 0.

- [ ] **Step 3: Rewrite `computeDailyStats`**

In `src/lib/metrics.ts`, replace the existing `computeDailyStats` function body with:

```typescript
/**
 * Compute the day's censorship metric from per-relay block counts.
 *
 * Counts must already be deduplicated (one relay per slot) — see
 * `BidtraceDataSource`. `date` classifies each relay with the OFAC posture in
 * effect that day. `totalSlots`, when given, yields the non-MEV-boost share.
 */
export function computeDailyStats(
  relays: RelayPayloadCount[],
  date: string,
  totalSlots?: number,
): DailyStatsResult {
  let censoring = 0;
  let nonCensoring = 0;
  for (const r of relays) {
    if (classifyRelay(r.relayId, date).posture === "censoring") {
      censoring += r.numPayloads;
    } else {
      nonCensoring += r.numPayloads;
    }
  }
  return dayStatsFromCounts(censoring, nonCensoring, totalSlots ?? 0);
}
```

Note: `dayStatsFromCounts` is defined in the same file (Task 1). Confirm the `DailyStatsResult` interface and `classifyRelay` import are still present and unchanged.

- [ ] **Step 4: Pass `totalSlots` through `persistDailySnapshot`**

In `src/lib/refresh/persist.ts`, change the two compute calls to forward `day.totalSlots`:

```typescript
  const stats = computeDailyStats(day.relays, day.date, day.totalSlots);
  const breakdown = computeRelayBreakdown(day.relays, day.date);
```

(`computeRelayBreakdown` is unchanged — relay share is correct from deduplicated counts.)

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS. If older `computeDailyStats` tests asserted the relayscan "share of deliveries" behaviour, update them to the deduplicated semantics (censoring relay counts now sum directly to censoring blocks). Paste the output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts src/lib/refresh/persist.ts
git commit -m "feat: compute day stats from deduplicated counts + non-boost share"
```

---

## Task 11: Wire `BidtraceDataSource` into the daily refresh

Swap `RelayscanDataSource` for `BidtraceDataSource` in the cron route and the refresh script.

**Files:**
- Modify: `src/app/api/refresh/route.ts`
- Modify: `scripts/refresh.ts`

- [ ] **Step 1: Update the cron route**

In `src/app/api/refresh/route.ts`, replace the import and the `refreshDay` call:

```typescript
import { BidtraceDataSource } from "@/lib/data-source/bidtrace";
```

```typescript
  const result = await refreshDay(date, new BidtraceDataSource());
```

Remove the now-unused `RelayscanDataSource` import.

- [ ] **Step 2: Update the refresh script**

In `scripts/refresh.ts`, make the same swap:

```typescript
import { BidtraceDataSource } from "../src/lib/data-source/bidtrace";
```

```typescript
  const result = await refreshDay(date, new BidtraceDataSource());
```

Remove the unused `RelayscanDataSource` import.

- [ ] **Step 3: Smoke-test against a real day**

Run: `pnpm refresh 2026-05-20`
Expected: `OK — 2026-05-20 refreshed.` (queries live relay APIs — needs network).

- [ ] **Step 4: Verify the refreshed day matches mevwatch**

```bash
npx tsx -e '
import "dotenv/config";
import { db } from "./src/lib/db";
import { dailyStats } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";
const [r] = await db.select().from(dailyStats).where(eq(dailyStats.date,"2026-05-20"));
console.log("forward pipeline 2026-05-20 censorshipPct =", r.censorshipPct.toFixed(1));
process.exit(0);'
```

Expected: within ~2 points of mevwatch.info's value for 2026-05-20 (~34.7%). A larger gap is tuned in Task 12.

- [ ] **Step 5: Run lint and the suite, then commit**

Run: `pnpm lint && pnpm test`
Expected: PASS.

```bash
git add src/app/api/refresh/route.ts scripts/refresh.ts
git commit -m "feat: switch daily refresh to the per-block bidtrace pipeline"
```

---

## Task 12: Validate and tune the forward pipeline against mevwatch

Run the forward pipeline over the last 30 days, diff each day against mevwatch.info, and tune `TIE_BREAK_ORDER` / relay postures until it matches.

**Files:**
- Create: `scripts/validate-forward.ts`
- Modify (as needed): `src/config/relays.ts`

- [ ] **Step 1: Write the validation script**

Create `scripts/validate-forward.ts`:

```typescript
import "dotenv/config";
import { BidtraceDataSource } from "../src/lib/data-source/bidtrace";
import { computeDailyStats, dayStatsFromCounts } from "../src/lib/metrics";
import {
  fetchMevwatchWindows,
  aggregateWindowsToDays,
} from "../src/lib/data-source/mevwatch";

function lastNDates(n: number): string[] {
  const out: string[] = [];
  for (let i = 2; i < n + 2; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function main() {
  const days = lastNDates(30);
  const mwByDate = new Map(
    aggregateWindowsToDays(await fetchMevwatchWindows()).map((d) => [
      d.date,
      dayStatsFromCounts(d.censoringBlocks, d.nonCensoringBlocks, d.totalSlots)
        .censorshipPct,
    ]),
  );

  const source = new BidtraceDataSource();
  let sumAbsErr = 0;
  let compared = 0;
  for (const date of days) {
    const mw = mwByDate.get(date);
    if (mw === undefined) continue;
    try {
      const day = await source.fetchDay(date);
      const ours = computeDailyStats(day.relays, date, day.totalSlots).censorshipPct;
      const err = ours - mw;
      sumAbsErr += Math.abs(err);
      compared += 1;
      console.log(
        `${date}  ours=${ours.toFixed(1)}  mevwatch=${mw.toFixed(1)}  diff=${err.toFixed(1)}`,
      );
    } catch (e) {
      console.warn(`${date}  SKIP — ${(e as Error).message}`);
    }
  }
  console.log(
    `\nMean absolute error over ${compared} days: ${(sumAbsErr / compared).toFixed(2)} points`,
  );
  process.exit(0);
}

main();
```

- [ ] **Step 2: Add the package.json script**

In `package.json` `scripts`, add:

```json
    "validate-forward": "tsx scripts/validate-forward.ts",
```

- [ ] **Step 3: Run the validation**

Run: `pnpm validate-forward`
Expected: a per-day table and a mean absolute error.

- [ ] **Step 4: Tune if the mean absolute error exceeds 2.0 points**

Inspect the per-day `diff` column:
- **Consistent positive bias** (forward over-reports): a censoring relay is winning tie-breaks it should not. Move it later in `TIE_BREAK_ORDER` in `src/config/relays.ts`.
- **Consistent negative bias** (forward under-reports): a censoring relay is missing or misclassified. Check each relay id in the latest day's `day.relays` against `RELAYS`/`HISTORICAL_RELAYS` — any id that `classifyRelay` does not recognise is counted as neutral. In particular confirm whether relayscan/the relay APIs expose **Titan Regional** as a distinct host; if censoring Titan volume is being missed, add that relay to `RELAYS` with `posture: "censoring"` and the correct `dataApiHost`, and give it a `TIE_BREAK_ORDER` slot.
- **One-off outliers**: usually a relay outage that day — acceptable, leave it.

After each change, re-run `pnpm validate-forward`. Repeat until mean absolute error < 2.0 points.

- [ ] **Step 5: Commit the tuned config**

```bash
git add src/config/relays.ts package.json scripts/validate-forward.ts
git commit -m "feat: add forward-pipeline validation + tune relay tie-break"
```

---

## Task 13: Update the methodology copy

The FAQ and methodology page still describe the relayscan "delivery-share" method. Correct them.

**Files:**
- Modify: `src/config/faq.ts`
- Modify: the methodology page (find with `grep -rl "relayscan" src/app`)

- [ ] **Step 1: Rewrite the "How is this measured?" FAQ answer**

In `src/config/faq.ts`, replace the answer for the `"How is this measured?"` item with:

```typescript
    a: "MEV Watch reads each relay's delivered-payload feed (the bidtrace `proposer_payload_delivered` API) and attributes every block to a single relay, so each block is counted exactly once. The censorship metric is the share of MEV-boost blocks attributed to OFAC-censoring relays. History since the Merge is sourced from mevwatch.info's original deduplicated dataset. Each relay's censorship posture is an editorial classification maintained in this codebase.",
```

- [ ] **Step 2: Update the methodology page**

Run `grep -rln "relayscan\|delivery-share\|per relay" src/app` to find the methodology page. Replace any text describing "censoring relays' share of relay payload deliveries" or "a ratio cancels the multi-relay double-counting" with the per-block deduplication description from Step 1. Remove claims that the metric is sourced live from relayscan.io.

- [ ] **Step 3: Verify the pages render**

Run: `pnpm dev`, open the homepage FAQ and the methodology page. Confirm the new copy renders and reads correctly.

- [ ] **Step 4: Run lint and the full suite**

Run: `pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/faq.ts src/app
git commit -m "docs: describe the per-block deduplication methodology"
```

---

## Done — verification checklist

- [ ] `pnpm db:summary` shows ~1345 days, range from 2022-09-15.
- [ ] Trend chart history matches mevwatch.info (spot-check 3 days, within 0.5 points).
- [ ] `pnpm validate-forward` reports mean absolute error < 2.0 points.
- [ ] `pnpm refresh <yesterday>` produces a value continuous with the backfilled history (no visible step in the trend chart at the cutover date).
- [ ] `pnpm lint && pnpm test` pass.
- [ ] FAQ and methodology page describe the per-block method.

## Out of scope (noted, not addressed here)

- **Historical `relay_daily_stats` / `builder_daily_stats`** stay relayscan-derived. They feed only the *latest-day* leaderboard, which the forward pipeline overwrites daily after cutover. Historical per-relay rows are not displayed anywhere. A future cleanup if per-relay history charts are ever built.
- **Builder display names:** the forward pipeline keys builders by `builder_pubkey`. A pubkey→name registry would make the builder leaderboard friendlier — a later polish.
- **`scripts/seed-history.ts`** (the old relayscan backfill) is superseded by `backfill-from-mevwatch.ts`. Left in place; not used.
- **Hero verdict thresholds** (`src/lib/hero-verdict.ts`): unchanged. Re-check the classifier bands look right against the corrected numbers during Task 4's site verification.
