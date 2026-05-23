# Per-Slot Relay Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace relayscan's per-relay payload-delivery aggregates with a per-slot winning-relay attribution sourced from Dune Analytics. Same metric definition, same chart, same schema — but every block counts once, attributed to its actual winning relay. Expected effect: the headline % on 2026-05-21 drops from 33.4% to ~10–15%.

**Architecture:** Add a new `DuneDataSource` adapter alongside the existing `RelayscanDataSource`, both implementing the same `DataSource` interface. A new `CompositeDataSource` fans the daily fetch out to Dune (for relays) and relayscan (for builders, which are already correctly counted). A factory keyed on a new `DATA_SOURCE_MODE` env var lets the cron, refresh script, and seed script swap between `relayscan` (legacy) and `composite` (new) sources without code changes. Schema is untouched; one-time backfill re-ingests the existing 1,344-day history.

**Tech Stack:** TypeScript, Next.js 16 App Router, libSQL + Drizzle ORM, Vitest, Zod, Dune Analytics Query API v1.

**Spec:** `docs/superpowers/specs/2026-05-24-per-slot-relay-attribution-design.md`

---

## File Structure

**New files:**
- `docs/dune/payloads-delivered.sql` — authoritative copy of the Dune saved query
- `src/lib/data-source/dune.ts` — Dune Query API v1 adapter implementing `DataSource`
- `src/lib/data-source/dune.test.ts` — adapter tests
- `src/lib/data-source/composite.ts` — fan-out `DataSource` that delegates relays/builders to two sources
- `src/lib/data-source/composite.test.ts` — composite tests
- `src/lib/data-source/factory.ts` — picks the source from `DATA_SOURCE_MODE`
- `src/lib/data-source/factory.test.ts` — factory tests
- `scripts/backfill-dune.ts` — one-time historical re-ingest

**Modified files:**
- `src/lib/env.ts` — add `getDuneApiKey()` and `getDunePayloadsQueryId()`
- `.env.example` — document the new Dune env vars
- `src/app/api/refresh/route.ts` — swap `new RelayscanDataSource()` for `getDataSource()`
- `scripts/refresh.ts` — same
- `scripts/seed-history.ts` — same
- `src/app/methodology/page.tsx` — copy update per spec §10

---

## Task 1: Commit the Dune SQL as the authoritative source

**Files:**
- Create: `docs/dune/payloads-delivered.sql`

- [ ] **Step 1: Create the SQL file**

```sql
-- Saved as a Dune query and referenced by ID from
-- src/lib/data-source/dune.ts (see DUNE_PAYLOADS_QUERY_ID env var).
-- Returns one row per relay per day, where num_payloads counts only the
-- slots whose claimed block_hash matches the canonical chain block —
-- i.e. the actual winning relay for each slot.

SELECT
  pd.relay                                                           AS relay,
  COUNT(*)                                                           AS num_payloads,
  CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(10,4))    AS percent
FROM mevboost.payloads_delivered AS pd
JOIN ethereum.blocks            AS b
  ON pd.block_hash = b.hash
WHERE pd.block_date = DATE '{{date}}'
GROUP BY pd.relay
ORDER BY num_payloads DESC
```

- [ ] **Step 2: Manually verify the query in Dune (out-of-band, blocking)**

Sign in to Dune, paste the SQL into a new query, parameterise `date`, set it to `2026-05-21`, and run it. The returned table should:

- Contain ~8 rows (one per active relay)
- Have `SUM(num_payloads)` close to 7,178 (the on-chain block count for that day) — *not* 12,516 (relayscan's inflated total)

If `mevboost.payloads_delivered` does not exist, search the Dune catalogue for the canonical table (likely candidates: `mev_boost.payloads_delivered`, `dune.mevboost.payloads_delivered`); update the SQL with the correct schema-qualified name and re-verify.

Save the query in Dune. Note the numeric query ID from the URL (`dune.com/queries/<ID>`).

- [ ] **Step 3: Commit**

```bash
git add docs/dune/payloads-delivered.sql
git commit -m "chore: add Dune SQL for per-slot relay attribution"
```

---

## Task 2: Add Dune env-var helpers

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `.env.example`
- Test: `src/lib/env.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/lib/env.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { getDuneApiKey, getDunePayloadsQueryId } from "./env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getDuneApiKey", () => {
  it("returns the key when set", () => {
    process.env.DUNE_API_KEY = "abc123";
    expect(getDuneApiKey()).toBe("abc123");
  });

  it("throws when missing", () => {
    delete process.env.DUNE_API_KEY;
    expect(() => getDuneApiKey()).toThrow(/DUNE_API_KEY/);
  });
});

describe("getDunePayloadsQueryId", () => {
  it("returns the numeric query id when set", () => {
    process.env.DUNE_PAYLOADS_QUERY_ID = "12345";
    expect(getDunePayloadsQueryId()).toBe(12345);
  });

  it("throws when missing", () => {
    delete process.env.DUNE_PAYLOADS_QUERY_ID;
    expect(() => getDunePayloadsQueryId()).toThrow(/DUNE_PAYLOADS_QUERY_ID/);
  });

  it("throws when not a positive integer", () => {
    process.env.DUNE_PAYLOADS_QUERY_ID = "not-a-number";
    expect(() => getDunePayloadsQueryId()).toThrow(/integer/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/env.test.ts`
Expected: FAIL with "getDuneApiKey is not a function" or similar import error.

- [ ] **Step 3: Implement the helpers**

Append to `src/lib/env.ts`:

```ts
/** Reads the Dune Analytics API key. Throws if unset. */
export function getDuneApiKey(): string {
  const key = process.env.DUNE_API_KEY;
  if (!key) {
    throw new Error(
      "DUNE_API_KEY environment variable is not set. Get a free key at dune.com.",
    );
  }
  return key;
}

/**
 * Reads the numeric ID of the saved Dune query that returns per-slot winning
 * relay counts. See docs/dune/payloads-delivered.sql for the query itself.
 */
export function getDunePayloadsQueryId(): number {
  const raw = process.env.DUNE_PAYLOADS_QUERY_ID;
  if (!raw) {
    throw new Error(
      "DUNE_PAYLOADS_QUERY_ID environment variable is not set.",
    );
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      `DUNE_PAYLOADS_QUERY_ID must be a positive integer, got: ${raw}`,
    );
  }
  return id;
}
```

- [ ] **Step 4: Document the env vars in .env.example**

Append to `.env.example`:

```bash

# Dune Analytics — required when DATA_SOURCE_MODE=composite.
# Sign in at dune.com and create a free API key under Settings → API.
DUNE_API_KEY=
# Numeric ID of the saved Dune query (see docs/dune/payloads-delivered.sql).
# Visible in the Dune URL: dune.com/queries/<this-id>.
DUNE_PAYLOADS_QUERY_ID=
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/lib/env.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts .env.example
git commit -m "feat(env): add DUNE_API_KEY and DUNE_PAYLOADS_QUERY_ID helpers"
```

---

## Task 3: Implement the Dune adapter

**Files:**
- Create: `src/lib/data-source/dune.ts`
- Test: `src/lib/data-source/dune.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-source/dune.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { DuneDataSource } from "./dune";

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DuneDataSource", () => {
  it("has the provider name 'dune.com'", () => {
    expect(new DuneDataSource("key", 1).name).toBe("dune.com");
  });

  it("executes the query, polls to completion, and parses the result rows", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" })) // execute
      .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_EXECUTING" })) // poll 1
      .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_COMPLETED" })) // poll 2
      .mockResolvedValueOnce(
        okResponse({
          result: {
            rows: [
              { relay: "relay.ultrasound.money", num_payloads: 2380 },
              { relay: "titanrelay.xyz", num_payloads: 1680 },
            ],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new DuneDataSource("key-123", 42).fetchDay("2026-05-21");

    expect(result.date).toBe("2026-05-21");
    expect(result.relays).toEqual([
      { relayId: "relay.ultrasound.money", numPayloads: 2380 },
      { relayId: "titanrelay.xyz", numPayloads: 1680 },
    ]);
    expect(result.builders).toEqual([]);

    // 1 execute + 2 polls + 1 results = 4 calls
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("sends the date parameter to the execute endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" }))
      .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_COMPLETED" }))
      .mockResolvedValueOnce(okResponse({ result: { rows: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await new DuneDataSource("key-123", 42).fetchDay("2026-05-21");

    const executeCall = fetchMock.mock.calls[0];
    expect(executeCall[0]).toBe("https://api.dune.com/api/v1/query/42/execute");
    const body = JSON.parse(executeCall[1].body as string);
    expect(body).toEqual({ query_parameters: { date: "2026-05-21" } });
    expect(executeCall[1].headers["X-Dune-API-Key"]).toBe("key-123");
  });

  it("throws when the execute endpoint returns a non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("nope", { status: 500 })),
    );
    await expect(
      new DuneDataSource("k", 1).fetchDay("2026-05-21"),
    ).rejects.toThrow(/dune/i);
  });

  it("throws when the poll reports QUERY_STATE_FAILED", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" }))
        .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_FAILED" })),
    );
    await expect(
      new DuneDataSource("k", 1).fetchDay("2026-05-21"),
    ).rejects.toThrow(/failed/i);
  });

  it("throws when the result shape is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" }))
        .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_COMPLETED" }))
        .mockResolvedValueOnce(okResponse({ unexpected: true })),
    );
    await expect(
      new DuneDataSource("k", 1).fetchDay("2026-05-21"),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/data-source/dune.test.ts`
Expected: FAIL with module-not-found for `./dune`.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/data-source/dune.ts`:

```ts
import { z } from "zod";
import type { DataSource, DayRelayStats } from "./types";

const ExecuteResponse = z.object({ execution_id: z.string() });
const StatusResponse = z.object({ state: z.string() });
const ResultsResponse = z.object({
  result: z.object({
    rows: z.array(
      z.object({
        relay: z.string(),
        num_payloads: z.number(),
      }),
    ),
  }),
});

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

/** The Dune Analytics Query API v1. */
export class DuneDataSource implements DataSource {
  readonly name = "dune.com";

  private readonly baseUrl = "https://api.dune.com/api/v1";

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
      relays: rows.map((r) => ({
        relayId: r.relay,
        numPayloads: r.num_payloads,
      })),
      // Builders come from a different source via the composite; this adapter
      // only owns relay-level data.
      builders: [],
    };
  }

  private async execute(date: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/query/${this.queryId}/execute`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ query_parameters: { date } }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `dune execute failed for ${date}: HTTP ${response.status}`,
      );
    }
    return ExecuteResponse.parse(await response.json()).execution_id;
  }

  private async pollUntilComplete(executionId: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const response = await fetch(
        `${this.baseUrl}/execution/${executionId}/status`,
        { headers: this.headers },
      );
      if (!response.ok) {
        throw new Error(`dune status failed: HTTP ${response.status}`);
      }
      const { state } = StatusResponse.parse(await response.json());
      if (state === "QUERY_STATE_COMPLETED") return;
      if (state === "QUERY_STATE_FAILED") {
        throw new Error(`dune execution ${executionId} reported FAILED`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(
      `dune execution ${executionId} did not complete within ${POLL_TIMEOUT_MS}ms`,
    );
  }

  private async fetchResults(executionId: string) {
    const response = await fetch(
      `${this.baseUrl}/execution/${executionId}/results`,
      { headers: this.headers },
    );
    if (!response.ok) {
      throw new Error(`dune results failed: HTTP ${response.status}`);
    }
    return ResultsResponse.parse(await response.json()).result.rows;
  }

  private get headers(): Record<string, string> {
    return {
      "X-Dune-API-Key": this.apiKey,
      "content-type": "application/json",
      accept: "application/json",
    };
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/data-source/dune.test.ts`
Expected: PASS, all 6 tests green.

If the "polls to completion" test times out (because the 2-second poll interval is real), the test uses `vi.useFakeTimers()` or mocks `setTimeout`. Adjust the test setup with:

```ts
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

beforeEach(() => {
  // Make the 2s poll interval instant.
  vi.spyOn(global, "setTimeout").mockImplementation((cb: () => void) => {
    cb();
    return 0 as unknown as NodeJS.Timeout;
  });
});
```

Add this to the test file's top if needed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-source/dune.ts src/lib/data-source/dune.test.ts
git commit -m "feat(data-source): add DuneDataSource adapter"
```

---

## Task 4: Implement the composite source

**Files:**
- Create: `src/lib/data-source/composite.ts`
- Test: `src/lib/data-source/composite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-source/composite.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { CompositeDataSource } from "./composite";
import type { DataSource } from "./types";

const makeSource = (
  name: string,
  result: { relays?: unknown[]; builders?: unknown[] },
): DataSource => ({
  name,
  fetchDay: vi.fn(async (date: string) => ({
    date,
    relays: (result.relays ?? []) as never,
    builders: (result.builders ?? []) as never,
  })),
});

describe("CompositeDataSource", () => {
  it("composes the name from both children", () => {
    const composite = new CompositeDataSource(
      makeSource("dune.com", {}),
      makeSource("relayscan.io", {}),
    );
    expect(composite.name).toBe("dune.com+relayscan.io");
  });

  it("takes relays from the first source and builders from the second", async () => {
    const relays = [{ relayId: "ultra", numPayloads: 100 }];
    const builders = [{ builderId: "titan", numBlocks: 50 }];
    const composite = new CompositeDataSource(
      makeSource("dune.com", { relays, builders: [{ builderId: "WRONG", numBlocks: 1 }] }),
      makeSource("relayscan.io", { relays: [{ relayId: "WRONG", numPayloads: 1 }], builders }),
    );

    const result = await composite.fetchDay("2026-05-21");

    expect(result.date).toBe("2026-05-21");
    expect(result.relays).toEqual(relays);
    expect(result.builders).toEqual(builders);
  });

  it("fetches both children in parallel", async () => {
    const order: string[] = [];
    const slowRelays: DataSource = {
      name: "dune.com",
      fetchDay: vi.fn(async (date: string) => {
        await new Promise((r) => setTimeout(r, 20));
        order.push("relays");
        return { date, relays: [], builders: [] };
      }),
    };
    const fastBuilders: DataSource = {
      name: "relayscan.io",
      fetchDay: vi.fn(async (date: string) => {
        order.push("builders");
        return { date, relays: [], builders: [] };
      }),
    };

    await new CompositeDataSource(slowRelays, fastBuilders).fetchDay("2026-05-21");

    expect(order).toEqual(["builders", "relays"]);
  });

  it("propagates errors from the relays child", async () => {
    const broken: DataSource = {
      name: "dune.com",
      fetchDay: vi.fn(async () => {
        throw new Error("dune down");
      }),
    };
    const ok = makeSource("relayscan.io", {});
    await expect(
      new CompositeDataSource(broken, ok).fetchDay("2026-05-21"),
    ).rejects.toThrow(/dune down/);
  });

  it("propagates errors from the builders child", async () => {
    const ok = makeSource("dune.com", {});
    const broken: DataSource = {
      name: "relayscan.io",
      fetchDay: vi.fn(async () => {
        throw new Error("relayscan down");
      }),
    };
    await expect(
      new CompositeDataSource(ok, broken).fetchDay("2026-05-21"),
    ).rejects.toThrow(/relayscan down/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/data-source/composite.test.ts`
Expected: FAIL with module-not-found for `./composite`.

- [ ] **Step 3: Implement the composite**

Create `src/lib/data-source/composite.ts`:

```ts
import type { DataSource, DayRelayStats } from "./types";

/**
 * Combines two upstreams: one supplies relay data, the other supplies builder
 * data. Used to pair the Dune per-slot relay attribution with relayscan's
 * (already-correct) builder counts. Fail-closed — either child throwing
 * surfaces to the caller.
 */
export class CompositeDataSource implements DataSource {
  readonly name: string;

  constructor(
    private readonly relaysSource: DataSource,
    private readonly buildersSource: DataSource,
  ) {
    this.name = `${relaysSource.name}+${buildersSource.name}`;
  }

  async fetchDay(date: string): Promise<DayRelayStats> {
    const [r, b] = await Promise.all([
      this.relaysSource.fetchDay(date),
      this.buildersSource.fetchDay(date),
    ]);
    return { date, relays: r.relays, builders: b.builders };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/data-source/composite.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-source/composite.ts src/lib/data-source/composite.test.ts
git commit -m "feat(data-source): add CompositeDataSource"
```

---

## Task 5: Add the data-source factory

**Files:**
- Create: `src/lib/data-source/factory.ts`
- Test: `src/lib/data-source/factory.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-source/factory.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { getDataSource } from "./factory";
import { RelayscanDataSource } from "./relayscan";
import { CompositeDataSource } from "./composite";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getDataSource", () => {
  it("returns a RelayscanDataSource when DATA_SOURCE_MODE is unset", () => {
    delete process.env.DATA_SOURCE_MODE;
    expect(getDataSource()).toBeInstanceOf(RelayscanDataSource);
  });

  it("returns a RelayscanDataSource when DATA_SOURCE_MODE=relayscan", () => {
    process.env.DATA_SOURCE_MODE = "relayscan";
    expect(getDataSource()).toBeInstanceOf(RelayscanDataSource);
  });

  it("returns a CompositeDataSource when DATA_SOURCE_MODE=composite", () => {
    process.env.DATA_SOURCE_MODE = "composite";
    process.env.DUNE_API_KEY = "k";
    process.env.DUNE_PAYLOADS_QUERY_ID = "42";
    const source = getDataSource();
    expect(source).toBeInstanceOf(CompositeDataSource);
    expect(source.name).toBe("dune.com+relayscan.io");
  });

  it("throws on an unknown DATA_SOURCE_MODE", () => {
    process.env.DATA_SOURCE_MODE = "made-up";
    expect(() => getDataSource()).toThrow(/DATA_SOURCE_MODE/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/data-source/factory.test.ts`
Expected: FAIL with module-not-found for `./factory`.

- [ ] **Step 3: Implement the factory**

Create `src/lib/data-source/factory.ts`:

```ts
import { getDuneApiKey, getDunePayloadsQueryId } from "../env";
import { CompositeDataSource } from "./composite";
import { DuneDataSource } from "./dune";
import { RelayscanDataSource } from "./relayscan";
import type { DataSource } from "./types";

/**
 * Returns the active relay data source, selected by the DATA_SOURCE_MODE env
 * var. Defaults to relayscan (legacy) until the composite is fully validated
 * in production. See spec §4.2 for the cutover sequence.
 *
 *   relayscan  — relayscan.io only (legacy; inflates the headline %).
 *   composite  — Dune for relays + relayscan for builders.
 */
export function getDataSource(): DataSource {
  const mode = process.env.DATA_SOURCE_MODE ?? "relayscan";
  if (mode === "relayscan") return new RelayscanDataSource();
  if (mode === "composite") {
    return new CompositeDataSource(
      new DuneDataSource(getDuneApiKey(), getDunePayloadsQueryId()),
      new RelayscanDataSource(),
    );
  }
  throw new Error(
    `Unknown DATA_SOURCE_MODE: '${mode}' (expected 'relayscan' or 'composite')`,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/data-source/factory.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-source/factory.ts src/lib/data-source/factory.test.ts
git commit -m "feat(data-source): add DATA_SOURCE_MODE factory"
```

---

## Task 6: Wire the factory into the refresh route and scripts

**Files:**
- Modify: `src/app/api/refresh/route.ts`
- Modify: `scripts/refresh.ts`
- Modify: `scripts/seed-history.ts`

- [ ] **Step 1: Update the cron route**

Edit `src/app/api/refresh/route.ts`:

Replace:
```ts
import { RelayscanDataSource } from "@/lib/data-source/relayscan";
```
with:
```ts
import { getDataSource } from "@/lib/data-source/factory";
```

Replace:
```ts
  const result = await refreshDay(
    date,
    new RelayscanDataSource(),
    new EthRpcBlockCountSource(),
  );
```
with:
```ts
  const result = await refreshDay(
    date,
    getDataSource(),
    new EthRpcBlockCountSource(),
  );
```

- [ ] **Step 2: Update the refresh CLI script**

Edit `scripts/refresh.ts` the same way: replace the `RelayscanDataSource` import with `getDataSource` from `../src/lib/data-source/factory`, and pass `getDataSource()` instead of `new RelayscanDataSource()`.

- [ ] **Step 3: Update the seed-history script**

Edit `scripts/seed-history.ts` the same way. The `source` variable on line 29 becomes `const source = getDataSource();`.

- [ ] **Step 4: Run the existing test suite to verify nothing broke**

Run: `pnpm test`
Expected: All tests pass — the factory defaults to `relayscan`, so behaviour is unchanged.

- [ ] **Step 5: Verify the build still succeeds**

Run: `pnpm build`
Expected: Build completes without TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/refresh/route.ts scripts/refresh.ts scripts/seed-history.ts
git commit -m "refactor: route refresh + scripts through DATA_SOURCE_MODE factory"
```

---

## Task 7: Write the backfill script

**Files:**
- Create: `scripts/backfill-dune.ts`
- Modify: `package.json` — add `db:backfill-dune` npm script

- [ ] **Step 1: Create the script**

Create `scripts/backfill-dune.ts`:

```ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { dailyStats, refreshLog } from "../src/lib/db/schema";
import { asc, desc, eq, and } from "drizzle-orm";
import { refreshDay } from "../src/lib/refresh";
import { getDataSource } from "../src/lib/data-source/factory";
import { EthRpcBlockCountSource } from "../src/lib/data-source/eth-rpc";

const MAX_CONCURRENCY = 3;
const EXPECTED_SOURCE_NAME = "dune.com+relayscan.io";

function* dateRange(start: string, end: string): Generator<string> {
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

/** Already-done = a refresh_log row with status=ok and source matching the composite name. */
async function isAlreadyBackfilled(date: string): Promise<boolean> {
  const rows = await db
    .select({ id: refreshLog.id })
    .from(refreshLog)
    .where(and(eq(refreshLog.status, "ok"), eq(refreshLog.source, EXPECTED_SOURCE_NAME)))
    .limit(1000);
  // Cheap check: see if any ok row from the composite source has a message
  // mentioning this date. (refresh_log doesn't have a per-date column.)
  return rows.some((r) =>
    // The refresh layer logs "Refreshed ${date}: ..." — the date is in the message.
    // We loaded ids only; we have to re-query for the message. Simplest: fetch
    // distinct messages once below instead. Done in main().
    false,
  );
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "composite") {
    console.error(
      `DATA_SOURCE_MODE must be 'composite' to run this backfill (got: ${process.env.DATA_SOURCE_MODE ?? "<unset>"}).`,
    );
    process.exit(1);
  }

  const minRow = await db.select({ date: dailyStats.date }).from(dailyStats).orderBy(asc(dailyStats.date)).limit(1);
  const maxRow = await db.select({ date: dailyStats.date }).from(dailyStats).orderBy(desc(dailyStats.date)).limit(1);
  if (minRow.length === 0 || maxRow.length === 0) {
    console.error("daily_stats is empty — run pnpm seed-history first.");
    process.exit(1);
  }
  const start = process.argv[2] ?? minRow[0].date;
  const end = process.argv[3] ?? maxRow[0].date;
  console.log(`Backfilling ${start} → ${end} from Dune (concurrency=${MAX_CONCURRENCY})…`);

  // Pre-fetch the set of already-backfilled dates from refresh_log.
  const doneRows = await db
    .select({ message: refreshLog.message })
    .from(refreshLog)
    .where(and(eq(refreshLog.status, "ok"), eq(refreshLog.source, EXPECTED_SOURCE_NAME)));
  const done = new Set<string>();
  for (const r of doneRows) {
    const match = r.message?.match(/Refreshed (\d{4}-\d{2}-\d{2}):/);
    if (match) done.add(match[1]);
  }
  console.log(`Skipping ${done.size} dates already backfilled.`);

  const source = getDataSource();
  const blockSource = new EthRpcBlockCountSource();

  const dates = [...dateRange(start, end)].filter((d) => !done.has(d));
  let ok = 0;
  let failed = 0;
  let inFlight = 0;
  let cursor = 0;

  await new Promise<void>((resolve) => {
    const launch = () => {
      while (inFlight < MAX_CONCURRENCY && cursor < dates.length) {
        const date = dates[cursor++];
        inFlight++;
        refreshDay(date, source, blockSource)
          .then((result) => {
            if (result.status === "ok") {
              ok++;
              if (ok % 25 === 0) {
                console.log(`  ${ok}/${dates.length} ok (failed=${failed})`);
              }
            } else {
              failed++;
              console.warn(`  FAIL ${date}: ${result.message}`);
            }
          })
          .catch((err) => {
            failed++;
            console.warn(`  THROW ${date}: ${err instanceof Error ? err.message : err}`);
          })
          .finally(() => {
            inFlight--;
            if (cursor >= dates.length && inFlight === 0) resolve();
            else launch();
          });
      }
    };
    launch();
  });

  console.log(`Backfill complete — ${ok} days written, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Remove the dead helper**

The `isAlreadyBackfilled` function above is a leftover from drafting — the actual dedup happens in `main()` via the pre-fetched `done` set. Delete the `isAlreadyBackfilled` function entirely (lines 22–34 inclusive in the file you just created). The script will not reference it.

- [ ] **Step 3: Add the npm script**

Edit `package.json`, in the `"scripts"` block, add (alphabetised near the other `db:*` scripts):

```json
"db:backfill-dune": "tsx scripts/backfill-dune.ts"
```

- [ ] **Step 4: Type-check the script**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Verify the script's argument parsing without hitting Dune**

Run (with `DATA_SOURCE_MODE` unset to confirm the guard):

```bash
pnpm db:backfill-dune
```

Expected output (non-zero exit):
```
DATA_SOURCE_MODE must be 'composite' to run this backfill (got: <unset>).
```

- [ ] **Step 6: Commit**

```bash
git add scripts/backfill-dune.ts package.json
git commit -m "feat(scripts): add Dune backfill script"
```

---

## Task 8: Update methodology page copy

**Files:**
- Modify: `src/app/methodology/page.tsx`

- [ ] **Step 1: Replace the metric paragraph in Section 4**

Open `src/app/methodology/page.tsx`. Find the block starting around line 156 (the two `<p>` tags after the "formula" callout in Section 4).

Replace the formula callout (currently lines 138–154) with:

```tsx
            {/* Formula callout */}
            <div className="border border-border-labrys bg-background px-6 py-5 mb-6">
              <p className="font-mono text-xs text-fg-muted tracking-[0.12em] uppercase mb-3">
                formula
              </p>
              <p className="font-sans font-bold text-lg text-foreground leading-snug">
                Censorship %{" "}
                <span className="text-fg-muted font-normal">=</span>{" "}
                <span className="text-accent-brand">
                  blocks won by censoring relays
                </span>{" "}
                <span className="text-fg-muted font-normal">/</span>{" "}
                <span className="text-foreground">
                  unique MEV-boost blocks delivered
                </span>
              </p>
            </div>
```

Replace the two paragraphs that follow the formula (currently lines 156–174) with:

```tsx
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              Each MEV-boost block is attributed to a single{" "}
              <span className="text-foreground">winning relay</span> — the relay
              whose signed payload became the canonical chain block. The
              denominator is the count of unique blocks delivered through
              MEV-boost that day; the numerator is the subset of those blocks
              whose winning relay applies OFAC sanctions filtering.
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed">
              The per-slot dedup matters. Multiple relays can claim they
              delivered a payload for the same slot, but only one relay&apos;s
              block hash matches the chain. Counting that single winner — rather
              than summing every relay&apos;s claimed deliveries — is what makes
              the ratio match what an observer sees watching blocks land.
            </p>
```

- [ ] **Step 2: Add Dune to Section 3 (Data source)**

Find Section 3 (the "Data source" section, around line 91–127). After the existing paragraph that mentions relayscan (around line 95–107), insert this paragraph before the `<div>` showing the endpoint code block (around line 108):

```tsx
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              Per-relay block attribution comes from{" "}
              <a
                href="https://dune.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-brand hover:underline transition-colors"
              >
                Dune Analytics
              </a>
              . A saved query joins each relay&apos;s bid traces against the
              canonical Ethereum block hash, so each slot is attributed to one
              relay — its actual winner. relayscan&apos;s daily JSON publishes
              per-relay aggregates only, which double-count when multiple relays
              deliver for the same slot.
            </p>
```

- [ ] **Step 3: Tighten Limitation 02 in Section 6**

Find Limitation 02 ("Locally-built blocks are not counted") around line 396–395. The denominator now strictly excludes non-boost blocks (the per-slot dedup is over MEV-boost slots only), so the caveat reads cleaner without "may overstate." Replace the inner `<p>` text (currently lines 387–392) with:

```tsx
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    Validators that build blocks locally (without MEV-Boost) are
                    not part of the MEV-Boost flow and therefore not counted in
                    either the numerator or the denominator. The non-boost
                    composition band on the dashboard shows their share of the
                    overall chain separately.
                  </p>
```

- [ ] **Step 4: Build to verify the page still compiles**

Run: `pnpm build`
Expected: Build completes; no TypeScript or React errors in the methodology page.

- [ ] **Step 5: Manual smoke check**

Run: `pnpm dev`
Expected: open `http://localhost:3000/methodology`, see the new formula ("blocks won by censoring relays / unique MEV-boost blocks delivered"), the Dune paragraph in §3, and the tightened §6 Limitation 02. Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 6: Commit**

```bash
git add src/app/methodology/page.tsx
git commit -m "docs(methodology): update copy for per-slot winner metric"
```

---

## Task 9: Cutover dry-run (manual, blocking)

**Files:** None.

- [ ] **Step 1: Provision Dune access**

In `.env`, populate:
```
DATA_SOURCE_MODE=composite
DUNE_API_KEY=<paste your Dune API key>
DUNE_PAYLOADS_QUERY_ID=<paste the saved query ID from Task 1>
```

- [ ] **Step 2: Smoke-test a single day through the new pipeline**

Run:
```bash
pnpm refresh 2026-05-21
```

Expected output:
```
Refreshing relay stats for 2026-05-21...
OK — 2026-05-21 refreshed.
```

If the run errors, the message names the failing layer (Dune execute, Dune poll, Dune results, persist, or block-count fetch). Fix per the message and re-run.

- [ ] **Step 3: Verify the headline number**

Run:
```bash
pnpm db:summary
```

Expected: latest line reads `latest: 2026-05-21 — censorship XX.X%` where `XX.X` is materially below 33.4 — somewhere in the ~8–18% band. If it sits at ~33% the dedup didn't fire; re-verify the Dune SQL's `JOIN ethereum.blocks` and check that `mevboost.payloads_delivered` is the right table.

- [ ] **Step 4: Run the full backfill**

Run:
```bash
pnpm db:backfill-dune
```

Expected: progress lines (`25/1344 ok`, `50/1344 ok`, …) and a final `Backfill complete — N days written, M failed.` Wall time ≈ 75–120 minutes. Any per-day failures are non-fatal (logged to `refresh_log` and retryable by rerunning the command — the script skips dates already marked ok).

- [ ] **Step 5: Verify the trend chart anchor points**

Run:
```bash
pnpm dev
```

Open `http://localhost:3000` and confirm:
- The headline % matches what `pnpm db:summary` reported (sanity check that the page reads from the DB).
- The trend chart is continuous (no flat zero stretch in the middle indicating an ingestion gap).
- 2023-12-19 visibly has a higher censorship % than 2023-12-17 in the chart (the bloXroute Max Profit posture change registers under the new data).

- [ ] **Step 6: No commit**

This task is verification only. Move on to Task 10 only once the dashboard looks right.

---

## Task 10: Make composite the default in production

**Files:**
- Modify: `src/lib/data-source/factory.ts`

**Pre-requisite:** Task 9 verification passed AND at least one week of clean refresh runs has elapsed in production with `DATA_SOURCE_MODE=composite`.

- [ ] **Step 1: Flip the default in the factory**

Edit `src/lib/data-source/factory.ts`. Replace:

```ts
  const mode = process.env.DATA_SOURCE_MODE ?? "relayscan";
```

with:

```ts
  const mode = process.env.DATA_SOURCE_MODE ?? "composite";
```

- [ ] **Step 2: Update the factory test that asserts the default**

Edit `src/lib/data-source/factory.test.ts`. Replace:

```ts
  it("returns a RelayscanDataSource when DATA_SOURCE_MODE is unset", () => {
    delete process.env.DATA_SOURCE_MODE;
    expect(getDataSource()).toBeInstanceOf(RelayscanDataSource);
  });
```

with:

```ts
  it("returns a CompositeDataSource when DATA_SOURCE_MODE is unset", () => {
    delete process.env.DATA_SOURCE_MODE;
    process.env.DUNE_API_KEY = "k";
    process.env.DUNE_PAYLOADS_QUERY_ID = "42";
    expect(getDataSource()).toBeInstanceOf(CompositeDataSource);
  });
```

- [ ] **Step 3: Run the test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data-source/factory.ts src/lib/data-source/factory.test.ts
git commit -m "feat(data-source): make composite the default source"
```

- [ ] **Step 5: Drop the env var from production config**

Remove `DATA_SOURCE_MODE` from the Vercel project settings (no longer needed — composite is the default). `DUNE_API_KEY` and `DUNE_PAYLOADS_QUERY_ID` stay.

---

## Self-Review Notes

**Spec coverage:**
- §2 Non-goals — Tasks 1–10 do not touch layout, OFAC tx detection, or relay classification. ✓
- §4 Architecture — `dune.ts` (Task 3), `composite.ts` (Task 4), wire-up (Task 6), env vars (Task 2). ✓
- §5 Dune query — Task 1. ✓
- §6 Dune adapter — Task 3. ✓
- §7 Composite — Task 4. ✓
- §8 Schema impact (none) — confirmed by Task 6 step 5 (`pnpm build` clean) and Task 9 step 4 (backfill upserts work). ✓
- §9 Backfill plan — Task 7 (script) + Task 9 (dry-run). ✓
- §10 Methodology copy — Task 8. ✓
- §11 Testing — every code task includes its own Vitest tests; Task 9 covers the integration anchors. ✓
- §12 Risks — Dune table naming is verified manually in Task 1 step 2; bloXroute Max Profit classification flagged as out of scope. ✓

**Type consistency:**
- `DuneDataSource(apiKey: string, queryId: number)` consistent across Task 3 (definition) and Task 5 (factory call).
- `CompositeDataSource(relays, builders)` argument order consistent — relays first, builders second, in Tasks 4, 5, and 7.
- `getDataSource(): DataSource` no parameters anywhere it's called (Tasks 5, 6, 7).

**Placeholder scan:** clean — every code step shows the actual code; every command shows expected output.
