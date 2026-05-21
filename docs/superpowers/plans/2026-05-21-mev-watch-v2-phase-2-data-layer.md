# MEV Watch v2 — Phase 2: Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working data pipeline — fetch MEV-boost relay statistics from relayscan.io, compute censorship metrics, and store daily snapshots in the local libSQL database, runnable on demand via `pnpm refresh` and seeded with real history via `pnpm seed-history`.

**Architecture:** An external data source (relayscan.io's public JSON API) sits behind a `DataSource` adapter interface. A pure metric-computation module turns relay payload counts into censorship/neutral/non-boost percentages using a hand-maintained OFAC classification config. A refresh routine orchestrates fetch → compute → persist → audit-log. Pages never call the external API — they read only the snapshot tables built in Phase 1.

**Tech Stack:** TypeScript · Drizzle ORM · libSQL · Zod (validation) · Vitest · `tsx` (scripts).

**Scope:** Phase 2 of 5. Builds on Phase 1 (the schema `daily_stats`, `relay_daily_stats`, `refresh_log` already exist). Phase 2 populates `daily_stats` and `relay_daily_stats`. The `recent_blocks` table is **not** populated here — relayscan's API is aggregate-only (no per-block data); the live block grid is handled in a later phase. Phase 3 (UI) consumes the snapshots this phase produces.

**Verified data source (do not re-verify):**
- `GET https://www.relayscan.io/stats/day/{YYYY-MM-DD}/json` → `{ date: string, relays: [{ relay: string, num_payloads: number, percent: string }], builders: [...] }`
- `GET https://www.relayscan.io/overview/json?t=24h` → `{ timespan, since, until, relays: [{ relay, num_payloads, percent }], builders: [...] }`

**Conventions:** Run commands from the repo root `C:\Users\Joshr\Desktop\Projects\Labrys-Group\mev-watch`, branch `MEVWatch-2`, PowerShell. Modules imported by `tsx` scripts (anything under `src/lib/refresh`, `src/lib/db`, `src/config`) must use **relative imports** among themselves so scripts resolve without a path-alias resolver. `@/*` aliases are fine inside React/Next code.

---

## Task 1: OFAC relay classification config

The editorial source of truth for which relays censor. relayscan reports market share; the censorship posture is our call.

**Files:**
- Create: `src/config/relays.ts`, `src/config/relays.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/config/relays.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { RELAYS, classifyRelay } from "./relays";

describe("RELAYS config", () => {
  it("has unique relay ids", () => {
    const ids = RELAYS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses valid posture values", () => {
    for (const r of RELAYS) {
      expect(["censoring", "neutral", "unknown"]).toContain(r.posture);
    }
  });
});

describe("classifyRelay", () => {
  it("returns the known posture for a configured relay", () => {
    expect(classifyRelay("boost-relay.flashbots.net").posture).toBe("censoring");
    expect(classifyRelay("relay.ultrasound.money").posture).toBe("neutral");
  });

  it("returns an unknown entry for an unconfigured relay", () => {
    const result = classifyRelay("brand-new-relay.example");
    expect(result.posture).toBe("unknown");
    expect(result.id).toBe("brand-new-relay.example");
    expect(result.name).toBe("brand-new-relay.example");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/config/relays.test.ts`
Expected: FAIL — cannot resolve `./relays`.

- [ ] **Step 3: Create `src/config/relays.ts`**

```ts
/**
 * Editorial OFAC-censorship classification of MEV-boost relays.
 *
 * relayscan.io reports each relay's market share, but whether a relay filters
 * OFAC-sanctioned transactions is an editorial judgement — so it is maintained
 * here by hand. Posture sourced from the ethstaker MEV relay list and relay
 * operator statements (as of May 2026). Review when relays are added/changed.
 */

export type RelayPosture = "censoring" | "neutral" | "unknown";

export interface RelayInfo {
  /** Identifier exactly as reported by relayscan.io's API (`relay` field). */
  id: string;
  /** Human-readable display name. */
  name: string;
  posture: RelayPosture;
}

export const RELAYS: RelayInfo[] = [
  { id: "relay.ultrasound.money", name: "Ultra Sound", posture: "neutral" },
  { id: "titanrelay.xyz", name: "Titan", posture: "neutral" },
  { id: "bloxroute.max-profit.blxrbdn.com", name: "bloXroute Max Profit", posture: "censoring" },
  { id: "bloxroute.regulated.blxrbdn.com", name: "bloXroute Regulated", posture: "censoring" },
  { id: "aestus.live", name: "Aestus", posture: "neutral" },
  { id: "boost-relay.flashbots.net", name: "Flashbots", posture: "censoring" },
  { id: "agnostic-relay.net", name: "Agnostic Gnosis", posture: "neutral" },
  { id: "relay.ethgas.com", name: "EthGas", posture: "unknown" },
];

const byId = new Map(RELAYS.map((r) => [r.id, r]));

/**
 * Look up a relay by its relayscan identifier. An unconfigured relay returns a
 * synthetic entry with posture "unknown" so new relays never crash the pipeline.
 */
export function classifyRelay(id: string): RelayInfo {
  return byId.get(id) ?? { id, name: id, posture: "unknown" };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/config/relays.test.ts`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add OFAC relay classification config"
```

---

## Task 2: DataSource adapter types

A provider-agnostic interface so the external source is mockable and swappable.

**Files:**
- Create: `src/lib/data-source/types.ts`

- [ ] **Step 1: Create `src/lib/data-source/types.ts`**

```ts
/** A single relay's payload count for a given day. */
export interface RelayPayloadCount {
  /** Relay identifier as reported by the upstream source. */
  relayId: string;
  /** Number of MEV-boost payloads delivered. */
  numPayloads: number;
}

/** One day of relay statistics from the external source. */
export interface DayRelayStats {
  /** ISO date, e.g. "2026-05-20". */
  date: string;
  relays: RelayPayloadCount[];
}

/**
 * A source of MEV-boost relay statistics. Implementations wrap an external
 * provider (relayscan.io, Dune, ...) so the refresh pipeline stays agnostic.
 */
export interface DataSource {
  /** The provider name, recorded in the refresh audit log. */
  readonly name: string;
  /** Fetch one day of relay stats. Throws on network/parse failure. */
  fetchDay(date: string): Promise<DayRelayStats>;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: add DataSource adapter interface"
```

---

## Task 3: Relayscan data source

The concrete `DataSource` for relayscan.io, with Zod-validated responses.

**Files:**
- Create: `src/lib/data-source/relayscan.ts`, `src/lib/data-source/relayscan.test.ts`
- Modify: `package.json` (add `zod`)

- [ ] **Step 1: Install Zod**

Run: `pnpm add zod`

- [ ] **Step 2: Write the failing test** — create `src/lib/data-source/relayscan.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { RelayscanDataSource } from "./relayscan";

const SAMPLE = {
  date: "2026-05-20",
  relays: [
    { relay: "relay.ultrasound.money", num_payloads: 4163, percent: "35.41" },
    { relay: "boost-relay.flashbots.net", num_payloads: 283, percent: "2.40" },
  ],
  builders: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelayscanDataSource", () => {
  it("fetchDay parses relay payload counts for a date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 })),
    );

    const source = new RelayscanDataSource();
    const result = await source.fetchDay("2026-05-20");

    expect(result.date).toBe("2026-05-20");
    expect(result.relays).toEqual([
      { relayId: "relay.ultrasound.money", numPayloads: 4163 },
      { relayId: "boost-relay.flashbots.net", numPayloads: 283 },
    ]);
  });

  it("requests the correct daily endpoint", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await new RelayscanDataSource().fetchDay("2026-05-20");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.relayscan.io/stats/day/2026-05-20/json",
      expect.any(Object),
    );
  });

  it("throws on a non-OK HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    await expect(new RelayscanDataSource().fetchDay("2026-05-20")).rejects.toThrow(
      /relayscan/i,
    );
  });

  it("throws when the response shape is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ wrong: true }), { status: 200 })),
    );
    await expect(new RelayscanDataSource().fetchDay("2026-05-20")).rejects.toThrow();
  });

  it("has the provider name 'relayscan.io'", () => {
    expect(new RelayscanDataSource().name).toBe("relayscan.io");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test src/lib/data-source/relayscan.test.ts`
Expected: FAIL — cannot resolve `./relayscan`.

- [ ] **Step 4: Create `src/lib/data-source/relayscan.ts`**

```ts
import { z } from "zod";
import type { DataSource, DayRelayStats } from "./types";

const RelaySchema = z.object({
  relay: z.string(),
  num_payloads: z.number(),
  percent: z.string(),
});

const DayStatsSchema = z.object({
  date: z.string(),
  relays: z.array(RelaySchema),
});

/** The relayscan.io public JSON API. */
export class RelayscanDataSource implements DataSource {
  readonly name = "relayscan.io";

  private readonly baseUrl = "https://www.relayscan.io";

  async fetchDay(date: string): Promise<DayRelayStats> {
    const url = `${this.baseUrl}/stats/day/${date}/json`;

    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `relayscan request failed for ${date}: HTTP ${response.status}`,
      );
    }

    const parsed = DayStatsSchema.parse(await response.json());

    return {
      date: parsed.date,
      relays: parsed.relays.map((r) => ({
        relayId: r.relay,
        numPayloads: r.num_payloads,
      })),
    };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/lib/data-source/relayscan.test.ts`
Expected: PASS — all 5 tests pass.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: add relayscan.io data source with Zod validation"
```

---

## Task 4: Metric computation

The pure function that turns relay payload counts into the censorship composition.

**Files:**
- Create: `src/lib/metrics.ts`, `src/lib/metrics.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/lib/metrics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeDailyStats, computeRelayBreakdown, SLOTS_PER_DAY } from "./metrics";

// Flashbots + both bloXroute relays are "censoring"; ultrasound is "neutral".
const RELAYS = [
  { relayId: "relay.ultrasound.money", numPayloads: 3000 },
  { relayId: "boost-relay.flashbots.net", numPayloads: 1000 },
];

describe("computeDailyStats", () => {
  it("splits censoring vs neutral vs non-boost", () => {
    const result = computeDailyStats(RELAYS);
    // mevBoostTotal = 4000; nonBoost = 7200 - 4000 = 3200; total = 7200
    expect(result.totalBlocks).toBe(SLOTS_PER_DAY);
    expect(result.censorshipPct).toBeCloseTo((1000 / 7200) * 100, 5);
    expect(result.neutralPct).toBeCloseTo((3000 / 7200) * 100, 5);
    expect(result.nonBoostPct).toBeCloseTo((3200 / 7200) * 100, 5);
  });

  it("the three percentages sum to 100", () => {
    const r = computeDailyStats(RELAYS);
    expect(r.censorshipPct + r.neutralPct + r.nonBoostPct).toBeCloseTo(100, 5);
  });

  it("treats unknown relays as non-censoring", () => {
    const r = computeDailyStats([{ relayId: "mystery-relay.xyz", numPayloads: 100 }]);
    expect(r.censorshipPct).toBe(0);
  });

  it("handles an empty day without dividing by zero", () => {
    const r = computeDailyStats([]);
    expect(r.totalBlocks).toBe(SLOTS_PER_DAY);
    expect(r.nonBoostPct).toBeCloseTo(100, 5);
  });

  it("clamps non-boost at zero when payloads exceed the slot estimate", () => {
    const r = computeDailyStats([{ relayId: "relay.ultrasound.money", numPayloads: 9000 }]);
    expect(r.nonBoostPct).toBe(0);
    expect(r.totalBlocks).toBe(9000);
  });
});

describe("computeRelayBreakdown", () => {
  it("returns per-relay share and posture-derived censorship rate", () => {
    const breakdown = computeRelayBreakdown(RELAYS);
    const flashbots = breakdown.find((b) => b.relayId === "boost-relay.flashbots.net")!;
    expect(flashbots.blocks).toBe(1000);
    expect(flashbots.sharePct).toBeCloseTo(25, 5);
    expect(flashbots.censorshipRate).toBe(100);
    const us = breakdown.find((b) => b.relayId === "relay.ultrasound.money")!;
    expect(us.censorshipRate).toBe(0);
    expect(us.sharePct).toBeCloseTo(75, 5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/metrics.test.ts`
Expected: FAIL — cannot resolve `./metrics`.

- [ ] **Step 3: Create `src/lib/metrics.ts`**

```ts
// Relative import (not "@/config/relays"): this module is transitively
// imported by tsx scripts, which do not resolve the @/* path alias.
import { classifyRelay } from "../config/relays";
import type { RelayPayloadCount } from "./data-source/types";

/**
 * Ethereum produces one slot every 12s → 7200 slots per day. Used to estimate
 * the non-MEV-boost share (blocks built locally by validators, which relayscan
 * does not report). This is an approximation, documented on the methodology page.
 */
export const SLOTS_PER_DAY = 7200;

export interface DailyStatsResult {
  censorshipPct: number;
  neutralPct: number;
  nonBoostPct: number;
  totalBlocks: number;
}

export interface RelayBreakdownEntry {
  relayId: string;
  name: string;
  posture: string;
  blocks: number;
  sharePct: number;
  /** Posture-derived: 100 for a censoring relay, 0 otherwise. Phase 2 has no
   *  measured per-relay transaction-censorship rate; revisit in a later phase. */
  censorshipRate: number;
}

/** Compute the day's censorship composition from relay payload counts. */
export function computeDailyStats(relays: RelayPayloadCount[]): DailyStatsResult {
  const mevBoostTotal = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  let censoring = 0;
  for (const r of relays) {
    if (classifyRelay(r.relayId).posture === "censoring") {
      censoring += r.numPayloads;
    }
  }
  const neutral = mevBoostTotal - censoring;
  const nonBoost = Math.max(0, SLOTS_PER_DAY - mevBoostTotal);
  const totalBlocks = mevBoostTotal + nonBoost;

  const pct = (n: number) => (totalBlocks === 0 ? 0 : (n / totalBlocks) * 100);

  return {
    censorshipPct: pct(censoring),
    neutralPct: pct(neutral),
    nonBoostPct: pct(nonBoost),
    totalBlocks,
  };
}

/** Per-relay breakdown (share of MEV-boost blocks) for the leaderboard. */
export function computeRelayBreakdown(
  relays: RelayPayloadCount[],
): RelayBreakdownEntry[] {
  const mevBoostTotal = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  return relays.map((r) => {
    const info = classifyRelay(r.relayId);
    return {
      relayId: r.relayId,
      name: info.name,
      posture: info.posture,
      blocks: r.numPayloads,
      sharePct: mevBoostTotal === 0 ? 0 : (r.numPayloads / mevBoostTotal) * 100,
      censorshipRate: info.posture === "censoring" ? 100 : 0,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/metrics.test.ts`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add censorship metric computation"
```

---

## Task 5: Snapshot persistence

Upsert one day's computed metrics into `daily_stats` and `relay_daily_stats`.

**Files:**
- Create: `src/lib/refresh/persist.ts`

- [ ] **Step 1: Create `src/lib/refresh/persist.ts`**

```ts
import { db } from "../db";
import { dailyStats, relayDailyStats } from "../db/schema";
import { computeDailyStats, computeRelayBreakdown } from "../metrics";
import type { DayRelayStats } from "../data-source/types";

/**
 * Compute metrics for one day of relay stats and upsert them into the snapshot
 * tables. Idempotent — re-running for the same date overwrites that day's rows.
 */
export async function persistDailySnapshot(day: DayRelayStats): Promise<void> {
  const stats = computeDailyStats(day.relays);
  const breakdown = computeRelayBreakdown(day.relays);

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
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: add daily snapshot persistence"
```

---

## Task 6: Refresh orchestration

The routine that ties fetch → persist → audit log together.

**Files:**
- Create: `src/lib/refresh/index.ts`, `src/lib/refresh/index.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/lib/refresh/index.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { refreshDay } from "./index";
import type { DataSource } from "../data-source/types";

function fakeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    name: "fake",
    fetchDay: vi.fn(async (date: string) => ({
      date,
      relays: [{ relayId: "relay.ultrasound.money", numPayloads: 100 }],
    })),
    ...overrides,
  };
}

describe("refreshDay", () => {
  it("returns ok with the date when the source succeeds", async () => {
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", fakeSource(), { persist, log });

    expect(result.status).toBe("ok");
    expect(persist).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", source: "fake" }),
    );
  });

  it("returns error and logs it when the source throws", async () => {
    const source = fakeSource({
      fetchDay: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", source, { persist, log });

    expect(result.status).toBe("error");
    expect(persist).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", source: "fake" }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/refresh/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Create `src/lib/refresh/index.ts`**

```ts
import { db } from "../db";
import { refreshLog } from "../db/schema";
import type { DataSource } from "../data-source/types";
import { persistDailySnapshot } from "./persist";

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
  persist: (day: Awaited<ReturnType<DataSource["fetchDay"]>>) => Promise<void>;
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
 */
export async function refreshDay(
  date: string,
  source: DataSource,
  deps: RefreshDeps = defaultDeps,
): Promise<RefreshResult> {
  try {
    const day = await source.fetchDay(date);
    await deps.persist(day);
    await deps.log({
      status: "ok",
      source: source.name,
      message: `Refreshed ${date}: ${day.relays.length} relays`,
    });
    return { status: "ok", date };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.log({ status: "error", source: source.name, message });
    return { status: "error", date, message };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/refresh/index.test.ts`
Expected: PASS — both tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add refresh orchestration routine"
```

---

## Task 7: The `pnpm refresh` script

A CLI entry point that refreshes the most recent complete day.

**Files:**
- Create: `scripts/refresh.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create `scripts/refresh.ts`**

```ts
import "dotenv/config";
import { refreshDay } from "../src/lib/refresh";
import { RelayscanDataSource } from "../src/lib/data-source/relayscan";

/** Returns yesterday's date (UTC) as an ISO string — the most recent complete day. */
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const date = process.argv[2] ?? yesterdayUtc();
  console.log(`Refreshing relay stats for ${date}...`);

  const result = await refreshDay(date, new RelayscanDataSource());

  if (result.status === "ok") {
    console.log(`OK — ${date} refreshed.`);
    process.exit(0);
  } else {
    console.error(`FAILED — ${date}: ${result.message}`);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Add the script to `package.json`**

In `"scripts"`, add:
```json
"refresh": "tsx scripts/refresh.ts"
```

- [ ] **Step 3: Run it against the live API**

Run: `pnpm refresh`
Expected: prints `OK — <date> refreshed.`, exit 0. (This calls the real relayscan.io API.)

- [ ] **Step 4: Verify the row landed**

Run: `pnpm db:check` then inspect — or run a quick query. Confirm `daily_stats` now has a row for the refreshed date. (You may run `pnpm tsx` with a one-off select, or trust the refresh result; the next task seeds and verifies in bulk.)

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add pnpm refresh script"
```

---

## Task 8: The `pnpm seed-history` script

Backfill historical daily snapshots from the external source.

**Files:**
- Create: `scripts/seed-history.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create `scripts/seed-history.ts`**

```ts
import "dotenv/config";
import { refreshDay } from "../src/lib/refresh";
import { RelayscanDataSource } from "../src/lib/data-source/relayscan";

/** MEV-boost began at the Merge; relayscan has data from shortly after. */
const DEFAULT_START = "2022-09-15";

function* dateRange(start: string, end: string): Generator<string> {
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const start = process.argv[2] ?? DEFAULT_START;
  const end = process.argv[3] ?? yesterdayUtc();
  const source = new RelayscanDataSource();

  let ok = 0;
  let failed = 0;

  for (const date of dateRange(start, end)) {
    const result = await refreshDay(date, source);
    if (result.status === "ok") {
      ok += 1;
    } else {
      failed += 1;
      console.warn(`  skip ${date}: ${result.message}`);
    }
    // Be polite to the public API.
    await sleep(300);
  }

  console.log(`Seed complete — ${ok} days seeded, ${failed} skipped.`);
  process.exit(0);
}

main();
```

- [ ] **Step 2: Add the script to `package.json`**

In `"scripts"`, add:
```json
"seed-history": "tsx scripts/seed-history.ts"
```

- [ ] **Step 3: Run the history seed**

Run: `pnpm seed-history`
Expected: runs for several minutes (one request per day from 2022-09-15). Prints per-day skips for any days the source lacks, then `Seed complete — N days seeded, M skipped.` A large majority of days should seed successfully.

> If relayscan rate-limits or the run is interrupted, re-running is safe — `persistDailySnapshot` upserts. You may also seed a shorter range, e.g. `pnpm seed-history 2024-01-01`.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add pnpm seed-history script"
```

> The seeded `data/mevwatch.db` is gitignored and is NOT committed — only the script is.

---

## Task 9: End-to-end verification and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a verification query script** — create `scripts/db-summary.ts`:

```ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { dailyStats } from "../src/lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const rows = await db.select().from(dailyStats).orderBy(desc(dailyStats.date));
  console.log(`daily_stats rows: ${rows.length}`);
  if (rows.length > 0) {
    const latest = rows[0];
    console.log(
      `latest: ${latest.date} — censorship ${latest.censorshipPct.toFixed(1)}% ` +
        `· neutral ${latest.neutralPct.toFixed(1)}% · non-boost ${latest.nonBoostPct.toFixed(1)}%`,
    );
  }
  process.exit(0);
}

main();
```

- [ ] **Step 2: Add the script to `package.json`**

In `"scripts"`, add:
```json
"db:summary": "tsx scripts/db-summary.ts"
```

- [ ] **Step 3: Run it**

Run: `pnpm db:summary`
Expected: prints a row count in the hundreds and a plausible latest-day line (censorship/neutral/non-boost percentages summing to ~100).

- [ ] **Step 4: Run the full quality suite**

Run each and confirm all pass:
```powershell
pnpm lint
pnpm test
pnpm build
```
Expected: lint clean, all unit tests pass (Phase 1 tests + the new Phase 2 tests), build succeeds.

- [ ] **Step 5: Update `CLAUDE.md`** — in the `## Commands` section, add these lines after `pnpm db:check`:

```
- `pnpm refresh [date]` — fetch + store one day of relay stats (default: yesterday)
- `pnpm seed-history [start] [end]` — backfill historical daily snapshots
- `pnpm db:summary` — print snapshot row count and the latest day
```

And change the `## Status` section to:

```
Phases 1 (Foundation) and 2 (Data layer) complete. Phases 3–5 (core UI, deploy, iteration) are tracked in `docs/superpowers/plans/`.
```

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: add db summary script and update docs for Phase 2"
```

---

## Done — Phase 2 complete

The data pipeline is live: `pnpm refresh` and `pnpm seed-history` populate `daily_stats` and `relay_daily_stats` from relayscan.io, with metrics computed from the OFAC classification config and every run recorded in `refresh_log`. Phase 3 (core UI) reads these snapshot tables to render the dashboard.
