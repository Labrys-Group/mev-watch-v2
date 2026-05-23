# Stacked 100% Censorship Composition Chart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-area censorship trend chart with a 100% stacked area chart of three bands — non-boosted, censored, non-censored — over all Ethereum blocks.

**Architecture:** A new `BlockCountSource` adapter counts total daily execution-layer blocks via a free public Ethereum RPC. The refresh pipeline derives `nonBoostPct = (total − MEV-boost blocks) / total`. A pure `toCompositionPoint` transform re-bases each daily point onto an all-blocks denominator so three bands stack to 100%. The headline censorship metric (censoring share of MEV-boost) is unchanged everywhere.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM (libSQL), recharts, Vitest, Playwright, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-05-22-stacked-censorship-chart-design.md`

---

## File Structure

**Create:**
- `src/lib/data-source/eth-rpc.ts` — `EthRpcBlockCountSource` + the pure `findBlockAtOrAfter` search
- `src/lib/data-source/eth-rpc.test.ts` — unit tests for the above
- `src/lib/composition.ts` — `toCompositionPoint` pure chart transform
- `src/lib/composition.test.ts` — unit tests for the above
- `scripts/backfill-nonboost.ts` — one-off backfill of `nonBoostPct` / `totalChainBlocks` for existing rows
- `drizzle/0003_*.sql` — generated migration (Task 2)

**Modify:**
- `src/lib/data-source/types.ts` — add `BlockCountSource`, `DaySnapshot`
- `src/lib/db/schema.ts` — add `totalChainBlocks` to `dailyStats`
- `src/lib/metrics.ts` — `nonBoostShare` helper; new `computeDailyStats` signature
- `src/lib/metrics.test.ts` — updated for the new signature
- `src/lib/refresh/persist.ts` — `persistDailySnapshot(day: DaySnapshot)`
- `src/lib/refresh/index.ts` — `refreshDay` gains a `blockSource`; degraded-block-count path
- `src/lib/refresh/index.test.ts` — updated, plus the degraded path
- `src/app/api/refresh/route.ts`, `scripts/refresh.ts`, `scripts/seed-history.ts` — thread the block source
- `src/lib/queries.ts` — `TrendPoint` + `getTrend` gain `nonBoostPct`
- `src/app/globals.css` — retune `--neutral` / `--ofac`
- `src/components/sections/trend-chart.tsx` — rebuilt as the stacked chart
- `.env.example` — add `ETH_RPC_URL`
- `package.json` — add the `backfill-nonboost` script
- `e2e/home.spec.ts` — assert three stacked bands

---

## Task 1: Ethereum-RPC block-count data source

**Files:**
- Modify: `src/lib/data-source/types.ts`
- Create: `src/lib/data-source/eth-rpc.ts`
- Create: `src/lib/data-source/eth-rpc.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add the `BlockCountSource` interface**

In `src/lib/data-source/types.ts`, append at the end of the file:

```ts
/**
 * A source of total execution-layer block counts, used to derive the
 * non-MEV-boost share. Separate from `DataSource` — a different provider
 * (an Ethereum RPC) answers a different question.
 */
export interface BlockCountSource {
  /** The provider name. */
  readonly name: string;
  /** Total execution-layer blocks proposed during the given UTC date. */
  totalBlocks(date: string): Promise<number>;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/data-source/eth-rpc.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { findBlockAtOrAfter, EthRpcBlockCountSource } from "./eth-rpc";

afterEach(() => vi.unstubAllGlobals());

describe("findBlockAtOrAfter", () => {
  it("finds the lowest block at or after the target timestamp", async () => {
    const getTimestamp = async (n: number) => n * 12;
    expect(await findBlockAtOrAfter(6000, { head: 1000, getTimestamp })).toBe(500);
  });

  it("returns block 1 when the target precedes the chain", async () => {
    const getTimestamp = async (n: number) => n * 12;
    expect(await findBlockAtOrAfter(0, { head: 1000, getTimestamp })).toBe(1);
  });

  it("handles non-uniform block times", async () => {
    const ts = [0, 100, 112, 130, 140, 152, 170, 180, 200]; // index === block number
    const getTimestamp = async (n: number) => ts[n];
    expect(await findBlockAtOrAfter(135, { head: 8, getTimestamp })).toBe(4);
    expect(await findBlockAtOrAfter(112, { head: 8, getTimestamp })).toBe(2);
  });
});

/**
 * A fake `fetch` modelling a chain where block N has timestamp N (one second
 * per block). `badUrls` substrings always reject, to exercise endpoint fallback.
 */
function mockChainFetch(opts: { head: number; badUrls?: string[] }) {
  return vi.fn(async (url: string, init: { body: string }) => {
    if (opts.badUrls?.some((b) => url.includes(b))) {
      throw new Error("ECONNREFUSED");
    }
    const { method, params } = JSON.parse(init.body) as {
      method: string;
      params: unknown[];
    };
    if (method === "eth_blockNumber") {
      return { ok: true, json: async () => ({ result: `0x${opts.head.toString(16)}` }) };
    }
    if (method === "eth_getBlockByNumber") {
      const n = parseInt(params[0] as string, 16);
      return {
        ok: true,
        json: async () => ({ result: { timestamp: `0x${n.toString(16)}` } }),
      };
    }
    throw new Error(`unexpected method ${method}`);
  });
}

describe("EthRpcBlockCountSource.totalBlocks", () => {
  it("counts execution blocks within the UTC day", async () => {
    const start = Math.floor(Date.parse("2026-05-20T00:00:00Z") / 1000);
    vi.stubGlobal("fetch", mockChainFetch({ head: start + 200_000 }));
    const source = new EthRpcBlockCountSource(["https://rpc.test"]);
    expect(await source.totalBlocks("2026-05-20")).toBe(86_400);
  });

  it("falls back to the next endpoint when one fails", async () => {
    const start = Math.floor(Date.parse("2026-05-20T00:00:00Z") / 1000);
    vi.stubGlobal("fetch", mockChainFetch({ head: start + 200_000, badUrls: ["bad.test"] }));
    const source = new EthRpcBlockCountSource(["https://bad.test", "https://good.test"]);
    expect(await source.totalBlocks("2026-05-20")).toBe(86_400);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test -- src/lib/data-source/eth-rpc.test.ts`
Expected: FAIL — `eth-rpc.ts` does not exist / `findBlockAtOrAfter` not exported.

- [ ] **Step 4: Implement `eth-rpc.ts`**

Create `src/lib/data-source/eth-rpc.ts`:

```ts
import type { BlockCountSource } from "./types";

/** Public Ethereum JSON-RPC endpoints, tried in order. No API key required. */
const PUBLIC_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://cloudflare-eth.com",
];

interface JsonRpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

/**
 * Binary-search for the lowest block number whose timestamp is >= `targetTs`.
 * `getTimestamp` is injected so the search is unit-testable without a network.
 */
export async function findBlockAtOrAfter(
  targetTs: number,
  opts: { head: number; getTimestamp: (n: number) => Promise<number> },
): Promise<number> {
  let lo = 1;
  let hi = opts.head;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await opts.getTimestamp(mid)) < targetTs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Counts execution-layer blocks per UTC day via a public Ethereum RPC, so the
 * refresh pipeline can derive `non-boosted = totalBlocks − MEV-boost blocks`.
 */
export class EthRpcBlockCountSource implements BlockCountSource {
  readonly name = "eth-rpc";

  private readonly endpoints: string[];

  /** `endpoints` is injectable for tests; production prepends `ETH_RPC_URL`
   *  (if set) to the public fallback list. */
  constructor(endpoints?: string[]) {
    if (endpoints) {
      this.endpoints = endpoints;
    } else {
      const override = process.env.ETH_RPC_URL;
      this.endpoints = override ? [override, ...PUBLIC_RPCS] : [...PUBLIC_RPCS];
    }
  }

  /** A JSON-RPC call, advancing through the endpoint list on any failure. */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    let lastError: unknown;
    for (const url of this.endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "user-agent": "mev-watch/1.0",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as JsonRpcResponse<T>;
        if (json.error) throw new Error(json.error.message ?? "JSON-RPC error");
        if (json.result === undefined) throw new Error("JSON-RPC: empty result");
        return json.result;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      `all RPC endpoints failed for ${method}: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  private async blockTimestamp(blockNumber: number): Promise<number> {
    const block = await this.rpc<{ timestamp: string }>("eth_getBlockByNumber", [
      `0x${blockNumber.toString(16)}`,
      false,
    ]);
    return parseInt(block.timestamp, 16);
  }

  /** Total execution-layer blocks proposed during the given UTC date. */
  async totalBlocks(date: string): Promise<number> {
    const startTs = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
    const endTs = startTs + 86_400;

    const head = parseInt(await this.rpc<string>("eth_blockNumber", []), 16);
    const getTimestamp = (n: number) => this.blockTimestamp(n);

    const [firstOfDay, firstOfNextDay] = await Promise.all([
      findBlockAtOrAfter(startTs, { head, getTimestamp }),
      findBlockAtOrAfter(endTs, { head, getTimestamp }),
    ]);
    return firstOfNextDay - firstOfDay;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/lib/data-source/eth-rpc.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 6: Document the env var**

In `.env.example`, append:

```
# Optional: an Ethereum JSON-RPC URL used to count daily on-chain blocks
# (the non-MEV-boost share). Falls back to public RPCs when unset.
ETH_RPC_URL=
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/data-source/types.ts src/lib/data-source/eth-rpc.ts src/lib/data-source/eth-rpc.test.ts .env.example
git commit -m "$(cat <<'EOF'
feat: add an Ethereum-RPC block-count data source

Counts total execution-layer blocks per UTC day via a public RPC, with
an endpoint fallback list and an optional ETH_RPC_URL override.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Store `totalChainBlocks` on `daily_stats`

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0003_*.sql` (generated)

- [ ] **Step 1: Add the column to the schema**

In `src/lib/db/schema.ts`, in the `dailyStats` table, add `totalChainBlocks` between `totalBlocks` and `createdAt`:

```ts
export const dailyStats = sqliteTable("daily_stats", {
  date: text("date").primaryKey(), // ISO date, e.g. "2026-05-21"
  censorshipPct: real("censorship_pct").notNull(),
  neutralPct: real("neutral_pct").notNull(),
  nonBoostPct: real("non_boost_pct").notNull(),
  totalBlocks: integer("total_blocks").notNull(),
  /** Total execution-layer blocks proposed that UTC day. 0 = not yet
   *  backfilled (a real day always has ~7,150+). */
  totalChainBlocks: integer("total_chain_blocks").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `drizzle/0003_<random-name>.sql` is created, containing approximately:

```sql
ALTER TABLE `daily_stats` ADD `total_chain_blocks` integer DEFAULT 0 NOT NULL;
```

- [ ] **Step 3: Apply the migration**

Run: `pnpm db:migrate`
Expected: migration applies cleanly to the local libSQL file.

- [ ] **Step 4: Verify the database connection**

Run: `pnpm db:check`
Expected: connection OK, no error.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "$(cat <<'EOF'
feat: store totalChainBlocks on daily_stats

Provenance column for the non-MEV-boost share derivation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Derive non-boost share in the refresh pipeline

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/metrics.test.ts`
- Modify: `src/lib/data-source/types.ts`
- Modify: `src/lib/refresh/persist.ts`
- Modify: `src/lib/refresh/index.ts`
- Modify: `src/lib/refresh/index.test.ts`
- Modify: `src/app/api/refresh/route.ts`
- Modify: `scripts/refresh.ts`
- Modify: `scripts/seed-history.ts`

- [ ] **Step 1: Write the failing `nonBoostShare` test**

In `src/lib/metrics.test.ts`, replace the import block at the top:

```ts
import { describe, it, expect } from "vitest";
import { computeDailyStats, computeRelayBreakdown } from "./metrics";
import { computeBuilderBreakdown } from "./metrics";
```

with:

```ts
import { describe, it, expect } from "vitest";
import {
  computeDailyStats,
  computeRelayBreakdown,
  computeBuilderBreakdown,
  nonBoostShare,
} from "./metrics";
```

Then append a new describe block at the end of the file:

```ts
describe("nonBoostShare", () => {
  it("is the non-MEV-boost fraction of all chain blocks", () => {
    expect(nonBoostShare(10000, 9300)).toBeCloseTo(7, 5);
  });

  it("clamps to 0 when MEV-boost blocks exceed the chain total", () => {
    expect(nonBoostShare(100, 120)).toBe(0);
  });

  it("returns 0 when the chain total is zero or unknown", () => {
    expect(nonBoostShare(0, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/metrics.test.ts`
Expected: FAIL — `nonBoostShare` is not exported.

- [ ] **Step 3: Add `nonBoostShare` and the new `computeDailyStats` to `metrics.ts`**

In `src/lib/metrics.ts`, replace the `nonBoostPct` field comment in `DailyStatsResult`:

```ts
  /** Non-MEV-boost (locally built) block share (%). */
  nonBoostPct: number;
```

Add this exported helper immediately above `computeDailyStats`:

```ts
/**
 * Non-MEV-boost block share (%) — the fraction of all execution-layer blocks
 * that did not come through a relay. Clamped to [0, 100]; day-boundary noise
 * between relayscan's UTC day and execution-block timestamps could otherwise
 * nudge the raw value slightly out of range.
 */
export function nonBoostShare(
  totalChainBlocks: number,
  mevBoostBlocks: number,
): number {
  if (totalChainBlocks <= 0) return 0;
  const pct = ((totalChainBlocks - mevBoostBlocks) / totalChainBlocks) * 100;
  return Math.min(100, Math.max(0, pct));
}
```

Replace the entire `computeDailyStats` function with:

```ts
export function computeDailyStats(
  relays: RelayPayloadCount[],
  builders: BuilderBlockCount[],
  totalChainBlocks: number,
  date: string,
): DailyStatsResult {
  const totalDeliveries = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  let censoring = 0;
  for (const r of relays) {
    if (classifyRelay(r.relayId, date).posture === "censoring") {
      censoring += r.numPayloads;
    }
  }

  const censorshipPct =
    totalDeliveries === 0 ? 0 : (censoring / totalDeliveries) * 100;

  const mevBoostBlocks = builders.reduce((sum, b) => sum + b.numBlocks, 0);

  return {
    censorshipPct,
    neutralPct: totalDeliveries === 0 ? 0 : 100 - censorshipPct,
    nonBoostPct: nonBoostShare(totalChainBlocks, mevBoostBlocks),
    totalBlocks: totalDeliveries,
  };
}
```

Also update the JSDoc above `computeDailyStats` — change the `date` paragraph's surrounding text to mention builders if you wish; at minimum the signature change above is required. `BuilderBlockCount` is already imported at the top of the file.

- [ ] **Step 4: Update the existing `computeDailyStats` tests**

In `src/lib/metrics.test.ts`, replace the entire `describe("computeDailyStats", ...)` block with:

```ts
describe("computeDailyStats", () => {
  it("censorship % is the censoring relays' share of deliveries", () => {
    const r = computeDailyStats(RELAYS, [], 0, ANY_DATE);
    expect(r.censorshipPct).toBeCloseTo(25, 5); // 1000 / 4000
    expect(r.neutralPct).toBeCloseTo(75, 5);
    expect(r.totalBlocks).toBe(4000);
  });

  it("censorship + neutral sum to 100 for a non-empty day", () => {
    const r = computeDailyStats(RELAYS, [], 0, ANY_DATE);
    expect(r.censorshipPct + r.neutralPct).toBeCloseTo(100, 5);
  });

  it("treats unknown relays as non-censoring", () => {
    const r = computeDailyStats(
      [{ relayId: "mystery.xyz", numPayloads: 100 }],
      [],
      0,
      ANY_DATE,
    );
    expect(r.censorshipPct).toBe(0);
    expect(r.neutralPct).toBeCloseTo(100, 5);
  });

  it("handles an empty day without dividing by zero", () => {
    const r = computeDailyStats([], [], 0, ANY_DATE);
    expect(r.censorshipPct).toBe(0);
    expect(r.neutralPct).toBe(0);
    expect(r.totalBlocks).toBe(0);
  });

  it("classifies relays by the day's date for time-varying postures", () => {
    // bloXroute Max Profit was neutral until 2023-12-18, censoring after.
    const relays = [
      { relayId: "bloxroute.max-profit.blxrbdn.com", numPayloads: 1000 },
      { relayId: "relay.ultrasound.money", numPayloads: 1000 },
    ];
    expect(computeDailyStats(relays, [], 0, "2023-01-15").censorshipPct).toBe(0);
    expect(
      computeDailyStats(relays, [], 0, "2024-06-15").censorshipPct,
    ).toBeCloseTo(50, 5);
  });

  it("non-boost % is the share of chain blocks not built via MEV-boost", () => {
    const builders = [
      { builderId: "Titan", numBlocks: 6000 },
      { builderId: "Beaver", numBlocks: 3000 },
    ];
    const r = computeDailyStats(RELAYS, builders, 10000, ANY_DATE);
    expect(r.nonBoostPct).toBeCloseTo(10, 5); // (10000 - 9000) / 10000
  });
});
```

- [ ] **Step 5: Run the metrics tests to verify they pass**

Run: `pnpm test -- src/lib/metrics.test.ts`
Expected: PASS — all `computeDailyStats`, `nonBoostShare`, `computeRelayBreakdown`, `computeBuilderBreakdown` tests green.

- [ ] **Step 6: Add the `DaySnapshot` type**

In `src/lib/data-source/types.ts`, add immediately after the `DayRelayStats` interface:

```ts
/** One day of relay stats plus the day's total on-chain block count. */
export interface DaySnapshot extends DayRelayStats {
  /** Total execution-layer blocks proposed that UTC day. */
  totalChainBlocks: number;
}
```

- [ ] **Step 7: Update `persist.ts`**

Replace the entire contents of `src/lib/refresh/persist.ts` with:

```ts
import { db } from "../db";
import { dailyStats, relayDailyStats, builderDailyStats } from "../db/schema";
import { computeDailyStats, computeRelayBreakdown, computeBuilderBreakdown } from "../metrics";
import type { DaySnapshot } from "../data-source/types";

/**
 * Compute metrics for one day of relay stats and upsert them into the snapshot
 * tables. Idempotent — re-running for the same date overwrites that day's rows.
 */
export async function persistDailySnapshot(day: DaySnapshot): Promise<void> {
  const stats = computeDailyStats(
    day.relays,
    day.builders,
    day.totalChainBlocks,
    day.date,
  );
  const breakdown = computeRelayBreakdown(day.relays, day.date);

  await db
    .insert(dailyStats)
    .values({
      date: day.date,
      censorshipPct: stats.censorshipPct,
      neutralPct: stats.neutralPct,
      nonBoostPct: stats.nonBoostPct,
      totalBlocks: stats.totalBlocks,
      totalChainBlocks: day.totalChainBlocks,
    })
    .onConflictDoUpdate({
      target: dailyStats.date,
      set: {
        censorshipPct: stats.censorshipPct,
        neutralPct: stats.neutralPct,
        nonBoostPct: stats.nonBoostPct,
        totalBlocks: stats.totalBlocks,
        totalChainBlocks: day.totalChainBlocks,
      },
    });

  for (const relay of breakdown) {
    await db
      .insert(relayDailyStats)
      .values({
        relayKey: relay.relayId,
        date: day.date,
        blocks: relay.blocks,
        sharePct: relay.sharePct,
        censorshipRate: relay.censorshipRate,
      })
      .onConflictDoUpdate({
        target: [relayDailyStats.relayKey, relayDailyStats.date],
        set: {
          blocks: relay.blocks,
          sharePct: relay.sharePct,
          censorshipRate: relay.censorshipRate,
        },
      });
  }

  for (const builder of computeBuilderBreakdown(day.builders)) {
    await db
      .insert(builderDailyStats)
      .values({
        builderKey: builder.builderId,
        date: day.date,
        blocks: builder.blocks,
        sharePct: builder.sharePct,
      })
      .onConflictDoUpdate({
        target: [builderDailyStats.builderKey, builderDailyStats.date],
        set: {
          blocks: builder.blocks,
          sharePct: builder.sharePct,
        },
      });
  }
}
```

- [ ] **Step 8: Update `refresh/index.ts`**

Replace the entire contents of `src/lib/refresh/index.ts` with:

```ts
import { db } from "../db";
import { refreshLog } from "../db/schema";
import type { DataSource, BlockCountSource, DaySnapshot } from "../data-source/types";
import { persistDailySnapshot } from "./persist";
import { sendSlackAlert } from "./slack";

export interface RefreshResult {
  status: "ok" | "error";
  date: string;
  message?: string;
}

interface RefreshEntry {
  status: string;
  source: string;
  message: string;
}

/** Injectable side effects — defaulted to the real DB, overridable in tests. */
export interface RefreshDeps {
  persist: (day: DaySnapshot) => Promise<void>;
  log: (entry: RefreshEntry) => Promise<void>;
}

const defaultDeps: RefreshDeps = {
  persist: persistDailySnapshot,
  log: async (entry) => {
    await db.insert(refreshLog).values(entry);
  },
};

/**
 * Fetch, compute, and persist one day of stats. Never throws — failures are
 * recorded in `refresh_log` and returned as an error result, so a bad upstream
 * day never crashes the caller (cron job or seed script).
 *
 * A failure of `blockSource` alone does NOT fail the refresh: the day is
 * persisted with `totalChainBlocks = 0` (non-boost share 0) and the log entry
 * notes it. `scripts/backfill-nonboost.ts` repairs such days later — the
 * censorship metric must not be held hostage to a public RPC's uptime.
 */
export async function refreshDay(
  date: string,
  source: DataSource,
  blockSource: BlockCountSource,
  deps: RefreshDeps = defaultDeps,
): Promise<RefreshResult> {
  try {
    const day = await source.fetchDay(date);

    let totalChainBlocks = 0;
    let blockNote = "";
    try {
      totalChainBlocks = await blockSource.totalBlocks(date);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      blockNote = ` — block count unavailable: ${message}`;
      await sendSlackAlert(`Block count unavailable for ${date}: ${message}`);
    }

    const snapshot: DaySnapshot = { ...day, totalChainBlocks };
    await deps.persist(snapshot);
    await deps.log({
      status: "ok",
      source: source.name,
      message: `Refreshed ${date}: ${day.relays.length} relays${blockNote}`,
    });
    return { status: "ok", date };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.log({ status: "error", source: source.name, message });
    await sendSlackAlert(`Refresh failed for ${date}: ${message}`);
    return { status: "error", date, message };
  }
}
```

- [ ] **Step 9: Update `refresh/index.test.ts`**

Replace the entire contents of `src/lib/refresh/index.test.ts` with:

```ts
import { describe, it, expect, vi } from "vitest";
import { refreshDay } from "./index";
import type { DataSource, BlockCountSource } from "../data-source/types";

function fakeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    name: "fake",
    fetchDay: vi.fn(async (date: string) => ({
      date,
      relays: [{ relayId: "relay.ultrasound.money", numPayloads: 100 }],
      builders: [],
    })),
    ...overrides,
  };
}

function fakeBlockSource(total = 7200): BlockCountSource {
  return {
    name: "fake-rpc",
    totalBlocks: vi.fn(async () => total),
  };
}

describe("refreshDay", () => {
  it("returns ok and persists the day with its chain block count", async () => {
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay(
      "2026-05-20",
      fakeSource(),
      fakeBlockSource(7200),
      { persist, log },
    );

    expect(result.status).toBe("ok");
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ totalChainBlocks: 7200 }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", source: "fake" }),
    );
  });

  it("returns error and logs it when the relay source throws", async () => {
    const source = fakeSource({
      fetchDay: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", source, fakeBlockSource(), {
      persist,
      log,
    });

    expect(result.status).toBe("error");
    expect(persist).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", source: "fake" }),
    );
  });

  it("still succeeds with a zero block count when the block source fails", async () => {
    const blockSource: BlockCountSource = {
      name: "fake-rpc",
      totalBlocks: vi.fn(async () => {
        throw new Error("all RPC endpoints failed");
      }),
    };
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", fakeSource(), blockSource, {
      persist,
      log,
    });

    expect(result.status).toBe("ok");
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ totalChainBlocks: 0 }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        message: expect.stringContaining("block count unavailable"),
      }),
    );
  });
});
```

- [ ] **Step 10: Run the refresh tests to verify they pass**

Run: `pnpm test -- src/lib/refresh/index.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 11: Thread the block source through `/api/refresh`**

In `src/app/api/refresh/route.ts`, add the import after the `RelayscanDataSource` import:

```ts
import { EthRpcBlockCountSource } from "@/lib/data-source/eth-rpc";
```

and change the `refreshDay` call:

```ts
  const result = await refreshDay(
    date,
    new RelayscanDataSource(),
    new EthRpcBlockCountSource(),
  );
```

- [ ] **Step 12: Thread the block source through `scripts/refresh.ts`**

In `scripts/refresh.ts`, add the import after the `RelayscanDataSource` import:

```ts
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";
```

and change the `refreshDay` call:

```ts
  const result = await refreshDay(
    date,
    new RelayscanDataSource(),
    new EthRpcBlockCountSource(),
  );
```

- [ ] **Step 13: Thread the block source through `scripts/seed-history.ts`**

In `scripts/seed-history.ts`, add the import after the `RelayscanDataSource` import:

```ts
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";
```

Change the source construction inside `main`:

```ts
  const source = new RelayscanDataSource();
  const blockSource = new EthRpcBlockCountSource();
```

and the `refreshDay` call inside the loop:

```ts
    const result = await refreshDay(date, source, blockSource);
```

- [ ] **Step 14: Run the full test suite and a type-checking build**

Run: `pnpm test`
Expected: PASS — entire suite green.

Run: `pnpm build`
Expected: build succeeds — no TypeScript errors.

Run: `pnpm lint`
Expected: no lint errors.

- [ ] **Step 15: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts src/lib/data-source/types.ts src/lib/refresh/persist.ts src/lib/refresh/index.ts src/lib/refresh/index.test.ts src/app/api/refresh/route.ts scripts/refresh.ts scripts/seed-history.ts
git commit -m "$(cat <<'EOF'
feat: derive non-boost share in the daily refresh pipeline

computeDailyStats now takes builder counts and the day's total chain
blocks. A block-count failure degrades gracefully to nonBoostPct = 0
without failing the refresh.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Non-boost backfill script

**Files:**
- Create: `scripts/backfill-nonboost.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the backfill script**

Create `scripts/backfill-nonboost.ts`:

```ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { dailyStats, builderDailyStats } from "../src/lib/db/schema";
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";
import { nonBoostShare } from "../src/lib/metrics";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Populate `nonBoostPct` / `totalChainBlocks` for every existing daily_stats
 * row. MEV-boost block counts come from the already-persisted
 * builder_daily_stats — no relayscan re-fetch needed. Idempotent: safe to
 * re-run, and doubles as a repair tool for any day a live refresh left at 0.
 */
async function main() {
  const source = new EthRpcBlockCountSource();
  const rows = await db
    .select({ date: dailyStats.date })
    .from(dailyStats)
    .orderBy(dailyStats.date);

  console.log(`Backfilling non-boost share for ${rows.length} days...`);

  let updated = 0;
  let failed = 0;

  for (const { date } of rows) {
    try {
      const totalChainBlocks = await source.totalBlocks(date);
      const builders = await db
        .select({ blocks: builderDailyStats.blocks })
        .from(builderDailyStats)
        .where(eq(builderDailyStats.date, date));
      const mevBoostBlocks = builders.reduce((sum, b) => sum + b.blocks, 0);
      const nonBoostPct = nonBoostShare(totalChainBlocks, mevBoostBlocks);

      await db
        .update(dailyStats)
        .set({ totalChainBlocks, nonBoostPct })
        .where(eq(dailyStats.date, date));

      updated += 1;
      console.log(
        `  ${date}: ${nonBoostPct.toFixed(2)}% non-boost (${totalChainBlocks} blocks)`,
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  skip ${date}: ${message}`);
    }
    // Be polite to the public RPC.
    await sleep(200);
  }

  console.log(`Backfill complete — ${updated} updated, ${failed} skipped.`);
  process.exit(0);
}

main();
```

- [ ] **Step 2: Add the package.json script**

In `package.json`, inside the `scripts` object, add this line directly after the `"seed-history"` entry:

```json
    "backfill-nonboost": "tsx scripts/backfill-nonboost.ts",
```

- [ ] **Step 3: Run the backfill against the local database**

Run: `pnpm backfill-nonboost`
Expected: one log line per existing day showing a plausible non-boost percentage (roughly 4–12%), ending with `Backfill complete — N updated, 0 skipped` (a few skips are acceptable if the public RPC rate-limits — re-run to repair them).

- [ ] **Step 4: Verify the data landed**

Run: `pnpm db:summary`
Expected: snapshot row count unchanged, latest day present. (The backfill only updates existing rows.)

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-nonboost.ts package.json
git commit -m "$(cat <<'EOF'
feat: add the non-boost backfill script

One-off (and re-runnable repair) script that populates nonBoostPct and
totalChainBlocks for historical daily_stats rows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Composition data layer

**Files:**
- Modify: `src/lib/queries.ts`
- Create: `src/lib/composition.ts`
- Create: `src/lib/composition.test.ts`

- [ ] **Step 1: Add `nonBoostPct` to `TrendPoint` and `getTrend`**

In `src/lib/queries.ts`, replace the `TrendPoint` interface:

```ts
export interface TrendPoint {
  date: string;
  censorshipPct: number;
  /** Non-MEV-boost share of all chain blocks (%). Absent on points predating
   *  the block-count backfill — treat as 0. */
  nonBoostPct?: number;
}
```

and replace the `getTrend` function body's select:

```ts
/** Full censorship trend, oldest first — drives the trend chart. */
export async function getTrend(): Promise<TrendPoint[]> {
  const rows = await db
    .select({
      date: dailyStats.date,
      censorshipPct: dailyStats.censorshipPct,
      nonBoostPct: dailyStats.nonBoostPct,
    })
    .from(dailyStats)
    .orderBy(dailyStats.date);
  return rows;
}
```

- [ ] **Step 2: Write the failing `toCompositionPoint` test**

Create `src/lib/composition.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toCompositionPoint } from "./composition";

describe("toCompositionPoint", () => {
  it("the three bands sum to 100", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 47,
      nonBoostPct: 6.5,
    });
    expect(p.nonCensored + p.censored + p.nonBoost).toBeCloseTo(100, 5);
  });

  it("re-bases the bands onto the all-blocks denominator", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 50,
      nonBoostPct: 10,
    });
    expect(p.censored).toBeCloseTo(45, 5); // 50% of the 90% boosted share
    expect(p.nonCensored).toBeCloseTo(45, 5);
    expect(p.nonBoost).toBe(10);
  });

  it("collapses to the two-way split when non-boost data is absent", () => {
    const p = toCompositionPoint({ date: "2026-05-20", censorshipPct: 30 });
    expect(p.nonBoost).toBe(0);
    expect(p.censored).toBeCloseTo(30, 5);
    expect(p.nonCensored).toBeCloseTo(70, 5);
  });

  it("carries the headline censorship rate through unchanged", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 47,
      nonBoostPct: 6.5,
    });
    expect(p.censorshipPct).toBe(47);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test -- src/lib/composition.test.ts`
Expected: FAIL — `composition.ts` does not exist.

- [ ] **Step 4: Implement `composition.ts`**

Create `src/lib/composition.ts`:

```ts
import type { TrendPoint } from "./queries";

export interface CompositionPoint {
  date: string;
  /** Non-censoring MEV-boost blocks as a share of all chain blocks (%). */
  nonCensored: number;
  /** OFAC-censoring MEV-boost blocks as a share of all chain blocks (%). */
  censored: number;
  /** Non-MEV-boost blocks as a share of all chain blocks (%). */
  nonBoost: number;
  /** Headline metric carried through for the tooltip: censoring share of
   *  MEV-boost blocks (%). */
  censorshipPct: number;
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * Re-base one daily point onto an all-chain-blocks denominator so the three
 * bands stack to 100. `censorshipPct` is the censoring share of MEV-boost;
 * `nonBoostPct` is the non-MEV-boost share of all chain blocks. A point with no
 * `nonBoostPct` (pre-backfill) collapses to the plain censored/non-censored
 * split.
 */
export function toCompositionPoint(point: TrendPoint): CompositionPoint {
  const nonBoost = clamp(point.nonBoostPct ?? 0);
  const boostShare = 100 - nonBoost;
  const censored = clamp((point.censorshipPct * boostShare) / 100);
  const nonCensored = clamp(((100 - point.censorshipPct) * boostShare) / 100);
  return {
    date: point.date,
    nonCensored,
    censored,
    nonBoost,
    censorshipPct: point.censorshipPct,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/lib/composition.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries.ts src/lib/composition.ts src/lib/composition.test.ts
git commit -m "$(cat <<'EOF'
feat: expose nonBoostPct in the trend and add the composition transform

getTrend now carries nonBoostPct (also surfaced by /api/v1/trend).
toCompositionPoint re-bases each daily point onto an all-blocks
denominator so the chart's three bands stack to 100%.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Retune the colour tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Retune the light-mode tokens**

In `src/app/globals.css`, in the light-mode `:root` block, change the `--ofac` and `--neutral` lines. Replace:

```css
  --ofac:    #F0A9A0;
  --ofac-fg: #5E1A13;
  --neutral: #7DE9C4;
  --neutral-fg: #0A3D2C;
```

with:

```css
  --ofac:    #E07A6B;
  --ofac-fg: #5E1A13;
  --neutral: #A4D7A9;
  --neutral-fg: #0A3D2C;
```

- [ ] **Step 2: Retune the dark-mode token**

In the dark-mode block, replace the single line:

```css
  --neutral: #00EF9F;
```

with:

```css
  --neutral: #7AD9A2;
```

(Dark-mode `--ofac` is `#FF6B6B` — already red — and stays unchanged.)

- [ ] **Step 3: Verify the build still compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'EOF'
style: retune neutral/ofac tokens to pastel green and red

Aligns the censorship-chart and epoch-ledger semantic colours with the
new stacked composition chart.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Render the stacked composition chart

**Files:**
- Modify: `src/components/sections/trend-chart.tsx`
- Modify: `e2e/home.spec.ts`

- [ ] **Step 1: Rebuild `trend-chart.tsx`**

Replace the entire contents of `src/components/sections/trend-chart.tsx` with:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint, StatsSummary } from "@/lib/queries";
import { toCompositionPoint, type CompositionPoint } from "@/lib/composition";
import { formatPercent, formatDateShort } from "@/lib/format";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";

interface TrendChartProps {
  trend: TrendPoint[];
  summary: StatsSummary;
}

type Range = "ALL" | "1Y" | "90D";

const RANGE_LABELS: Range[] = ["ALL", "1Y", "90D"];

function getSlice(trend: TrendPoint[], range: Range): TrendPoint[] {
  if (range === "ALL") return trend;
  const count = range === "1Y" ? 365 : 90;
  return trend.slice(-count);
}

/** Pick a sparse subset of dates for X-axis ticks — at most ~8 ticks. */
function sparseTickIndices(data: { date: string }[], maxTicks = 8): string[] {
  if (data.length === 0) return [];
  const step = Math.max(1, Math.floor(data.length / maxTicks));
  const ticks: string[] = [];
  for (let i = 0; i < data.length; i += step) {
    ticks.push(data[i].date);
  }
  // Always include the last point.
  const last = data[data.length - 1].date;
  if (!ticks.includes(last)) ticks.push(last);
  return ticks;
}

/** One legend entry — a colour swatch plus its label. */
function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-2.5 h-2.5 shrink-0 ${className}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

interface TooltipItem {
  payload: CompositionPoint;
}

/** Custom tooltip — the three band percentages plus the headline rate. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="border border-border-labrys bg-panel px-3 py-2 font-mono text-[11px] tracking-[0.06em] text-foreground">
      <div className="text-fg-muted mb-1.5">{formatDateShort(String(label))}</div>
      <div className="flex items-center justify-between gap-5">
        <LegendSwatch className="bg-non-boost" label="Non-boosted" />
        <span>{formatPercent(point.nonBoost)}</span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <LegendSwatch className="bg-ofac" label="Censored" />
        <span>{formatPercent(point.censored)}</span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <LegendSwatch className="bg-neutral-relay" label="Non-censored" />
        <span>{formatPercent(point.nonCensored)}</span>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-border-labrys text-fg-muted normal-case">
        Censorship rate {formatPercent(point.censorshipPct)} of MEV-boost
      </div>
    </div>
  );
}

export function TrendChart({ trend, summary }: TrendChartProps) {
  const [range, setRange] = useState<Range>("ALL");
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Defer mounting the chart until it scrolls into view so the area
  // sweep animation plays exactly when the reader reaches it.
  const chartRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const data = useMemo<CompositionPoint[]>(
    () => getSlice(trend, range).map(toCompositionPoint),
    [trend, range],
  );
  const ticks = useMemo(() => sparseTickIndices(data), [data]);

  return (
    <Section
      label="02 / CENSORSHIP OVER TIME"
      title={
        <>
          Censorship % since
          <br />
          the Merge.
        </>
      }
      aside={
        <>
          <span>SHARE OF ALL BLOCKS</span>
          <br />
          <span>SEP 2022 — NOW</span>
        </>
      }
    >
      {/* Recessed chart well */}
      <div className="border border-border-labrys bg-background">
        {/* Stat header row — the headline censorship metric (share of MEV-boost) */}
        <div className="grid grid-cols-3 border-b border-border-labrys font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
          <div className="p-3 border-r border-border-labrys transition-colors duration-200 hover:bg-panel-alt">
            NOW
            <strong className="block font-sans font-bold text-[18px] tracking-[-0.015em] text-foreground mt-1 normal-case">
              <CountUp value={summary.current} decimals={1} suffix="%" />
            </strong>
          </div>
          <div className="p-3 border-r border-border-labrys transition-colors duration-200 hover:bg-panel-alt">
            PEAK
            <strong className="block font-sans font-bold text-[18px] tracking-[-0.015em] text-warn mt-1 normal-case">
              <CountUp value={summary.peak} decimals={1} suffix="%" />
            </strong>
          </div>
          <div className="p-3 transition-colors duration-200 hover:bg-panel-alt">
            TROUGH
            <strong className="block font-sans font-bold text-[18px] tracking-[-0.015em] text-good mt-1 normal-case">
              <CountUp value={summary.trough} decimals={1} suffix="%" />
            </strong>
          </div>
        </div>

        {/* Range toggle + legend + chart */}
        <div className="p-0">
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 pt-4 pb-0">
            {/* Segment control toolbar */}
            <div className="inline-flex border border-border-labrys">
              {RANGE_LABELS.map((r, i) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={[
                    "font-mono font-semibold text-[10.5px] tracking-[0.12em] uppercase px-3 py-1.5 border-0 cursor-pointer transition-all duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand focus-visible:ring-inset",
                    i < RANGE_LABELS.length - 1 ? "border-r border-border-labrys" : "",
                    range === r
                      ? "bg-accent-brand text-panel"
                      : "bg-transparent text-fg-muted hover:text-foreground hover:bg-panel-alt",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={range === r}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
              <LegendSwatch className="bg-non-boost" label="Non-boosted" />
              <LegendSwatch className="bg-ofac" label="Censored" />
              <LegendSwatch className="bg-neutral-relay" label="Non-censored" />
            </div>
          </div>

          {/* Chart */}
          <div ref={chartRef} className="w-full h-[260px] sm:h-[300px] px-2 pt-4 pb-2">
            {inView ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke="var(--border-labrys)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    ticks={ticks}
                    tickFormatter={formatDateShort}
                    tick={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                    }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: "var(--fg-muted)", strokeWidth: 1 }}
                  />
                  {/* Declared bottom-to-top: non-censored, censored, non-boosted */}
                  <Area
                    type="monotone"
                    dataKey="nonCensored"
                    stackId="1"
                    stroke="var(--neutral)"
                    strokeWidth={1}
                    fill="var(--neutral)"
                    fillOpacity={0.9}
                    dot={false}
                    isAnimationActive={!reduceMotion}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="censored"
                    stackId="1"
                    stroke="var(--ofac)"
                    strokeWidth={1}
                    fill="var(--ofac)"
                    fillOpacity={0.9}
                    dot={false}
                    isAnimationActive={!reduceMotion}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="nonBoost"
                    stackId="1"
                    stroke="var(--non-boost)"
                    strokeWidth={1}
                    fill="var(--non-boost)"
                    fillOpacity={0.9}
                    dot={false}
                    isAnimationActive={!reduceMotion}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Update the e2e chart assertion**

In `e2e/home.spec.ts`, replace the test named `"the trend chart renders its area series"` with:

```ts
test("the trend chart renders three stacked bands", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".recharts-area-area").first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator(".recharts-area-area")).toHaveCount(3);
});
```

- [ ] **Step 3: Run the unit suite and the type-checking build**

Run: `pnpm test`
Expected: PASS — entire suite green.

Run: `pnpm build`
Expected: build succeeds — no TypeScript errors.

Run: `pnpm lint`
Expected: no lint errors.

- [ ] **Step 4: Verify no UI consumer assumed a hardcoded-zero `nonBoostPct`**

Run: `grep -rn "nonBoostPct" src/app src/components`
Expected: no matches that render `nonBoostPct` as a value (`composition.tsx` uses `LatestStats` but destructures only `censorshipPct` and `totalBlocks`; the now-real value is harmless). If any surface renders it, confirm it displays a real percentage sensibly — this is expected, not a regression.

- [ ] **Step 5: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: PASS — all Playwright tests green, including `the trend chart renders three stacked bands`.

- [ ] **Step 6: Manual visual check**

Run: `pnpm dev`, open http://localhost:3000, scroll to the "Censorship over time" chart.
Expected: a 100% stacked chart — pastel green (non-censored) at the bottom, red (censored) in the middle, neutral gray (non-boosted, ~6–7%) on top; legend present; hovering shows all three percentages plus the headline rate. Toggle the theme and confirm both modes read well. Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/trend-chart.tsx e2e/home.spec.ts
git commit -m "$(cat <<'EOF'
feat: render the censorship chart as a 100% stacked composition

Three stacked bands — non-boosted, censored, non-censored — over all
Ethereum blocks, with a custom tooltip and legend. The headline
censorship metric (share of MEV-boost) is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- §3 denominator change → Task 5 (`toCompositionPoint`).
- §4 `BlockCountSource` / `EthRpcBlockCountSource` → Task 1.
- §5 metrics (`nonBoostShare`, new `computeDailyStats`) → Task 3.
- §6 schema column + pipeline threading → Tasks 2 and 3.
- §7 backfill → Task 4.
- §8 stacked chart (bands, tooltip, legend) → Task 7.
- §9 colour tokens → Task 6.
- §10 error handling (degraded block-count path) → Task 3, Steps 8–10.
- §11 API & consumers (`/api/v1/trend` gains `nonBoostPct`; verify `getLatestStats` consumers) → Task 5, Task 7 Step 4.
- §12 testing → tests in Tasks 1, 3, 5; e2e in Task 7.

**Type consistency:** `BlockCountSource` / `DaySnapshot` (Task 1, Task 3) are consumed with matching signatures in `refreshDay` and `persistDailySnapshot`. `computeDailyStats(relays, builders, totalChainBlocks, date)` is called consistently in `metrics.test.ts` and `persist.ts`. `CompositionPoint` fields (`nonCensored`, `censored`, `nonBoost`, `censorshipPct`) match the chart `dataKey`s and the tooltip. `nonBoostShare` is used identically in `metrics.ts` and `backfill-nonboost.ts`.

**No placeholders:** every step contains complete code or an exact command with expected output.

---

## Execution Handoff

Each task ends green (tests pass, build compiles) and is independently committable.
