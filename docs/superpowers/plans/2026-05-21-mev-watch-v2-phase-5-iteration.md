# MEV Watch v2 — Phase 5: Iteration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the three iteration features from the spec: **builder data** (a builder leaderboard fed by relayscan's builder stats), a **public read-only JSON API**, and a **status page** showing refresh health.

**Architecture:** A new `builder_daily_stats` table extends the snapshot store. The relayscan data source already receives a `builders` array — Phase 5 parses, computes, and persists it alongside relay data. Public API routes expose the existing query layer as JSON with permissive CORS. The status page reads `refresh_log`.

**Tech Stack:** Next.js 16 route handlers · Drizzle/libSQL · Vitest · Playwright.

**Scope:** Phase 5 of 5 — the final phase. Builds on Phases 1-4.

**Conventions:** Repo root `C:\Users\Joshr\Desktop\Projects\Labrys-Group\mev-watch`, branch `MEVWatch-2`, PowerShell. App code uses `@/*`; modules reached by `tsx` scripts (`src/lib/data-source`, `src/lib/refresh`, `src/lib/metrics`, `src/lib/db`, `src/config`) use relative imports among themselves.

---

## Task 1: Builder snapshot table

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: the generated migration under `drizzle/`

- [ ] **Step 1: Append to `src/lib/db/schema.ts`** (after the existing tables; `sqliteTable`, `text`, `integer`, `real`, `unique` are already imported):

```ts
/** Per builder per day — drives the builder leaderboard. */
export const builderDailyStats = sqliteTable(
  "builder_daily_stats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    builderKey: text("builder_key").notNull(),
    date: text("date").notNull(),
    blocks: integer("blocks").notNull(),
    sharePct: real("share_pct").notNull(),
  },
  (t) => [
    unique("builder_daily_stats_builder_date_unq").on(t.builderKey, t.date),
  ],
);
```

- [ ] **Step 2:** `pnpm build` → succeeds.
- [ ] **Step 3:** `pnpm db:generate` → a new migration file appears under `drizzle/`. Then `pnpm db:migrate` → applies it to the local DB.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "feat: add builder_daily_stats table"`

---

## Task 2: Parse builders in the data source

**Files:**
- Modify: `src/lib/data-source/types.ts`, `src/lib/data-source/relayscan.ts`, `src/lib/data-source/relayscan.test.ts`, `src/lib/refresh/index.test.ts`

- [ ] **Step 1: Add to `src/lib/data-source/types.ts`** a builder type, and add `builders` to `DayRelayStats`:

```ts
/** A single builder's block count for a given day. */
export interface BuilderBlockCount {
  /** Builder identifier (relayscan's `extra_data`). */
  builderId: string;
  numBlocks: number;
}
```
And change the `DayRelayStats` interface to include:
```ts
  builders: BuilderBlockCount[];
```
(alongside the existing `date` and `relays` fields).

- [ ] **Step 2: Update `src/lib/data-source/relayscan.test.ts`** — the `SAMPLE` constant's `builders` array currently is `[]`; replace it with:
```ts
  builders: [
    { info: { extra_data: "Titan (titanbuilder.xyz)", num_blocks: 3423, percent: "51.04" }, children: [] },
    { info: { extra_data: "Quasar", num_blocks: 1450, percent: "21.63" }, children: [] },
  ],
```
And add an assertion inside the "fetchDay parses..." test:
```ts
    expect(result.builders).toEqual([
      { builderId: "Titan (titanbuilder.xyz)", numBlocks: 3423 },
      { builderId: "Quasar", numBlocks: 1450 },
    ]);
```

- [ ] **Step 3: Run it — expect FAIL** (`result.builders` is undefined). `pnpm test src/lib/data-source/relayscan.test.ts`

- [ ] **Step 4: Update `src/lib/data-source/relayscan.ts`** — add builder parsing. After the `RelaySchema`, add:
```ts
const BuilderSchema = z.object({
  info: z.object({
    extra_data: z.string(),
    num_blocks: z.number(),
    percent: z.string(),
  }),
});
```
Add `builders: z.array(BuilderSchema)` to `DayStatsSchema`. In `fetchDay`'s return, add:
```ts
      builders: parsed.builders.map((b) => ({
        builderId: b.info.extra_data,
        numBlocks: b.info.num_blocks,
      })),
```

- [ ] **Step 5: Run it — expect PASS.** `pnpm test src/lib/data-source/relayscan.test.ts`

- [ ] **Step 6: Update `src/lib/refresh/index.test.ts`** — the `fakeSource`'s `fetchDay` returns `{ date, relays: [...] }`; add `builders: []` to that returned object so it satisfies the updated `DayRelayStats` type.

- [ ] **Step 7:** `pnpm test` → all pass; `pnpm build` → succeeds.
- [ ] **Step 8: Commit:** `git add -A && git commit -m "feat: parse builder stats from relayscan"`

---

## Task 3: Compute and persist builder stats

**Files:**
- Modify: `src/lib/metrics.ts`, `src/lib/metrics.test.ts`, `src/lib/refresh/persist.ts`

- [ ] **Step 1: Append a test to `src/lib/metrics.test.ts`:**
```ts
import { computeBuilderBreakdown } from "./metrics";

describe("computeBuilderBreakdown", () => {
  it("returns per-builder block counts and share", () => {
    const result = computeBuilderBreakdown([
      { builderId: "Titan", numBlocks: 75 },
      { builderId: "Quasar", numBlocks: 25 },
    ]);
    const titan = result.find((b) => b.builderId === "Titan")!;
    expect(titan.blocks).toBe(75);
    expect(titan.sharePct).toBeCloseTo(75, 5);
  });

  it("handles an empty builder list", () => {
    expect(computeBuilderBreakdown([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.** `pnpm test src/lib/metrics.test.ts`

- [ ] **Step 3: Append to `src/lib/metrics.ts`:**
```ts
import type { BuilderBlockCount } from "./data-source/types";

export interface BuilderBreakdownEntry {
  builderId: string;
  blocks: number;
  sharePct: number;
}

/** Per-builder share of MEV-boost blocks for the builder leaderboard. */
export function computeBuilderBreakdown(
  builders: BuilderBlockCount[],
): BuilderBreakdownEntry[] {
  const total = builders.reduce((sum, b) => sum + b.numBlocks, 0);
  return builders.map((b) => ({
    builderId: b.builderId,
    blocks: b.numBlocks,
    sharePct: total === 0 ? 0 : (b.numBlocks / total) * 100,
  }));
}
```
(Add the `import type { BuilderBlockCount }` near the existing `import type { RelayPayloadCount }` line.)

- [ ] **Step 4: Run it — expect PASS.** `pnpm test src/lib/metrics.test.ts`

- [ ] **Step 5: Update `src/lib/refresh/persist.ts`** — import `builderDailyStats` from `../db/schema` and `computeBuilderBreakdown` from `../metrics`. At the end of `persistDailySnapshot`, after the relay loop, add a builder loop that upserts each builder into `builderDailyStats` (same `onConflictDoUpdate` pattern as the relay loop, conflict target `[builderDailyStats.builderKey, builderDailyStats.date]`, setting `blocks` and `sharePct`). Use `computeBuilderBreakdown(day.builders)`.

- [ ] **Step 6:** `pnpm test` → all pass; `pnpm build` → succeeds.
- [ ] **Step 7: Commit:** `git add -A && git commit -m "feat: compute and persist builder stats"`

---

## Task 4: Populate builder data

- [ ] **Step 1: Run `pnpm refresh`** — fetches yesterday and now also persists builder stats. Confirm it prints `OK`.
- [ ] **Step 2: Verify** — run `pnpm tsx scripts/db-summary.ts` (still works) and a quick check that `builder_daily_stats` has rows: extend `scripts/db-summary.ts` to also print `builder_daily_stats` row count (add a `select` on `builderDailyStats` and a `console.log`). Run it, confirm builders > 0.
- [ ] **Step 3: Commit:** `git add -A && git commit -m "chore: populate builder stats for the latest day"`

> Note: only recent days have builder data (historical re-seed is optional — the builder leaderboard shows the latest day). A full `pnpm seed-history` re-run would backfill builder history but is not required.

---

## Task 5: Builder query and leaderboard component

**Files:**
- Modify: `src/lib/queries.ts`
- Create: `src/components/sections/builder-leaderboard.tsx`

- [ ] **Step 1: Add to `src/lib/queries.ts`** a `BuilderRow` interface (`{ builderId: string; blocks: number; sharePct: number }`) and an async `getBuilderLeaderboard(): Promise<BuilderRow[]>` — it finds the latest date present in `builderDailyStats`, selects that date's rows, maps them to `BuilderRow`, and sorts by `sharePct` descending. (Import `builderDailyStats` from `@/lib/db/schema`. Mirror the structure of the existing `getLeaderboard`.)

- [ ] **Step 2: Create `src/components/sections/builder-leaderboard.tsx`** — a server component, props `{ rows: BuilderRow[] }`. A table styled like the relay `Leaderboard` (`src/components/sections/leaderboard.tsx` — read it for the styling): section label `BUILDER LEADERBOARD`, columns rank / builder name / share bar + `formatPercent(sharePct)` / blocks. Builders have no OFAC posture — no posture badge. Graceful empty state. Token classes only, theme-aware.

- [ ] **Step 3:** `pnpm build` → succeeds.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "feat: add builder leaderboard query and component"`

---

## Task 6: Add the builder leaderboard to the homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1:** In `src/app/page.tsx`, import `getBuilderLeaderboard` from `@/lib/queries` and `BuilderLeaderboard` from `@/components/sections/builder-leaderboard`. Add `getBuilderLeaderboard()` to the `Promise.all([...])` destructuring (as `builders`). Render `<BuilderLeaderboard rows={builders} />` immediately after `<Leaderboard rows={leaderboard} />`.
- [ ] **Step 2:** `pnpm build` → succeeds. Briefly `pnpm dev` + fetch `http://localhost:3000`, confirm "BUILDER LEADERBOARD" text is present, stop the server.
- [ ] **Step 3: Commit:** `git add -A && git commit -m "feat: show the builder leaderboard on the homepage"`

---

## Task 7: Public JSON API

**Files:**
- Create: `src/lib/api-response.ts`, `src/app/api/v1/summary/route.ts`, `src/app/api/v1/trend/route.ts`, `src/app/api/v1/relays/route.ts`

- [ ] **Step 1: Create `src/lib/api-response.ts`** — a helper `apiJson(data: unknown): Response` returning `NextResponse.json(data)` with headers `Access-Control-Allow-Origin: *` and `Cache-Control: public, s-maxage=3600`.

- [ ] **Step 2: Create the three routes** — each a `GET` route handler (`runtime = "nodejs"`) that calls the query layer and returns `apiJson(...)`:
  - `src/app/api/v1/summary/route.ts` → `apiJson({ latest: await getLatestStats(), summary: await getStatsSummary() })`
  - `src/app/api/v1/trend/route.ts` → `apiJson({ trend: await getTrend() })`
  - `src/app/api/v1/relays/route.ts` → `apiJson({ relays: await getLeaderboard() })`

- [ ] **Step 3:** `pnpm build` → succeeds; confirm the three `/api/v1/*` routes appear.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "feat: add public read-only JSON API"`

---

## Task 8: API documentation page

**Files:**
- Create: `src/app/api-docs/page.tsx`
- Modify: `src/components/sections/site-header.tsx`

- [ ] **Step 1: Create `src/app/api-docs/page.tsx`** — a server component at `/api-docs`, terminal-styled with `SiteHeader`/`SiteFooter`, `metadata` set. Documents the three public endpoints (`GET /api/v1/summary`, `GET /api/v1/trend`, `GET /api/v1/relays`) — for each: the path, what it returns, and an example JSON response shape. Note the API is read-only, CORS-open, and cached ~hourly.
- [ ] **Step 2: Update `src/components/sections/site-header.tsx`** — change the nav `API` link's `href` from `/embed` to `/api-docs`.
- [ ] **Step 3:** `pnpm build` → succeeds.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "feat: add API documentation page"`

---

## Task 9: Status page

**Files:**
- Modify: `src/lib/queries.ts`
- Create: `src/app/status/page.tsx`

- [ ] **Step 1: Add to `src/lib/queries.ts`** an async `getRecentRefreshes(limit = 20): Promise<RefreshInfo[]>` — selects the most recent `refresh_log` rows ordered by `ranAt` descending. Extend the `RefreshInfo` interface to also carry `source: string` and `message: string | null` (it currently has only `ranAt` and `status`). **Also update the existing `getLastRefresh`** to populate the two new fields (`source`, `message`) in its returned object, so it still satisfies `RefreshInfo`.

- [ ] **Step 2: Create `src/app/status/page.tsx`** — a server component at `/status`, terminal-styled with `SiteHeader`/`SiteFooter`, `metadata` set. Shows: the last refresh time + status (green if `ok`), a data-freshness line (how long ago the latest `daily_stats` date is — use `getLatestStats`), and a table of recent refresh runs from `getRecentRefreshes()` (time, status, source, message). Use `formatRelativeTime` from `@/lib/format`.

- [ ] **Step 3:** `pnpm build` → succeeds; `/status` in the routes.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "feat: add status page"`

---

## Task 10: E2e tests, verification, and final docs

**Files:**
- Modify: `e2e/pages.spec.ts`, `CLAUDE.md`

- [ ] **Step 1: Add tests to `e2e/pages.spec.ts`** — smoke tests for `/api-docs` and `/status` (each returns < 400 and renders a key heading), and a test that `GET /api/v1/summary` returns HTTP 200 with JSON containing a `summary` (or `latest`) field.
- [ ] **Step 2: Run the full quality suite** — `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e` — all must pass.
- [ ] **Step 3: Update `CLAUDE.md`** — `## Status` becomes: `All 5 phases complete (foundation, data layer, core UI, deployment config, iteration). Production provisioning: see docs/DEPLOYMENT.md.` Add the public API and `/status` to the architecture notes briefly.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "test: Phase 5 e2e coverage; final docs"`

---

## Done — Phase 5 complete

Builder data, a public read-only JSON API, and a status page are live. MEV Watch v2 is feature-complete across all five phases.
