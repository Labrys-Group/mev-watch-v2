# MEV Watch v2 — Phase 3: Core UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the MEV Watch v2 dashboard — a single-page terminal-aesthetic scoreboard plus `/methodology`, `/explorer`, and `/embed` pages — reading the snapshot tables populated in Phase 2.

**Architecture:** Server components read the libSQL snapshot tables through a query layer (`src/lib/queries.ts`) and pass plain data to presentational section components. Interactive bits (trend-chart range toggle, FAQ accordion, theme toggle) are client components receiving data as props. The page is statically rendered with ISR. The visual design is defined by `mockup-b-terminal.html` at the repo root — implementers port each section from it.

**Tech Stack:** Next.js 16 (App Router, RSC) · React 19 · Tailwind v4 · shadcn/ui · Recharts · Drizzle/libSQL · Vitest · Playwright.

**Scope:** Phase 3 of 5. Builds on Phase 1 (foundation) + Phase 2 (data layer — `daily_stats`, `relay_daily_stats`, `refresh_log` are populated with 766 days of real data). Phase 4 deploys; Phase 5 adds builders/API/status.

## Design reference — read this first

`mockup-b-terminal.html` (repo root) is the authoritative visual design. Each UI task ports one section of it to React. **Adapt** the mockup as follows (the mockup predates final data decisions):

- **Theme:** the mockup is dark-only; v2 is **light + dark** via the existing `next-themes` setup. Use the design tokens in `src/app/globals.css` (`bg-background`, `text-foreground`, `text-fg-muted`, `border-border-labrys`, `text-accent-brand`, `bg-ofac`, `bg-neutral-relay`, `text-good`, `text-warn`, `font-mono`, `font-sans`, `.terminal-grid`). Never hard-code hex values — use token classes so both themes work.
- **Narrative:** "resistance is winning" — lead with the decline. Hero headline "CENSORSHIP IS FALLING"; the composition insight row is encouraging (mint/`good` toned), not a red alarm.
- **Composition is 2-way** (censoring vs neutral relay deliveries), not the mockup's 3-way — the non-MEV-boost slice is not derivable from the data source (see Phase 2). Drop the third segment.
- **Status bar:** replace the mockup's fake live slot/block/epoch with real values — network label, data-through date, current censorship %, last-updated time.
- **Recent blocks (mockup section 05):** there is no per-block data source yet. Build it as a **composition grid** — a tile grid visualising the *current censoring/neutral ratio*, labelled as a ratio visual (not a literal live block stream). A true live stream is a Phase 5 item.

**Conventions:** Run commands from the repo root `C:\Users\Joshr\Desktop\Projects\Labrys-Group\mev-watch`, branch `MEVWatch-2`, PowerShell. App code uses the `@/*` path alias. Section components live in `src/components/sections/`, shared bits in `src/components/`. Server components by default; add `"use client"` only where interaction requires it.

---

## Task 1: Data-access query layer

Typed query functions the UI reads. These run server-side against libSQL.

**Files:**
- Create: `src/lib/queries.ts`, `src/lib/queries.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/queries.test.ts`. Test the pure derivation helper `summarise` (exported from queries.ts) with no DB:

```ts
import { describe, it, expect } from "vitest";
import { summarise } from "./queries";

const TREND = [
  { date: "2022-11-01", censorshipPct: 80 },
  { date: "2023-06-01", censorshipPct: 50 },
  { date: "2026-05-20", censorshipPct: 31 },
];

describe("summarise", () => {
  it("reports current, peak, and trough", () => {
    const s = summarise(TREND);
    expect(s.current).toBe(31);
    expect(s.peak).toBe(80);
    expect(s.peakDate).toBe("2022-11-01");
    expect(s.trough).toBe(31);
  });

  it("returns null for an empty trend", () => {
    expect(summarise([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.** `pnpm test src/lib/queries.test.ts`

- [ ] **Step 3: Create `src/lib/queries.ts`:**

```ts
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyStats, relayDailyStats, refreshLog } from "@/lib/db/schema";
import { classifyRelay } from "@/config/relays";

export interface TrendPoint {
  date: string;
  censorshipPct: number;
}

export interface StatsSummary {
  current: number;
  peak: number;
  peakDate: string;
  trough: number;
}

export interface LatestStats {
  date: string;
  censorshipPct: number;
  neutralPct: number;
  totalBlocks: number;
}

export interface LeaderboardRow {
  relayId: string;
  name: string;
  posture: string;
  blocks: number;
  sharePct: number;
}

export interface RefreshInfo {
  ranAt: Date;
  status: string;
}

/** Pure derivation — peak/current/trough from a trend series. Exported for testing. */
export function summarise(trend: TrendPoint[]): StatsSummary | null {
  if (trend.length === 0) return null;
  let peak = trend[0];
  let trough = trend[0];
  for (const p of trend) {
    if (p.censorshipPct > peak.censorshipPct) peak = p;
    if (p.censorshipPct < trough.censorshipPct) trough = p;
  }
  return {
    current: trend[trend.length - 1].censorshipPct,
    peak: peak.censorshipPct,
    peakDate: peak.date,
    trough: trough.censorshipPct,
  };
}

/** Full censorship trend, oldest first — drives the trend chart. */
export async function getTrend(): Promise<TrendPoint[]> {
  const rows = await db
    .select({ date: dailyStats.date, censorshipPct: dailyStats.censorshipPct })
    .from(dailyStats)
    .orderBy(dailyStats.date);
  return rows;
}

/** The most recent day's composition. */
export async function getLatestStats(): Promise<LatestStats | null> {
  const [row] = await db
    .select()
    .from(dailyStats)
    .orderBy(desc(dailyStats.date))
    .limit(1);
  if (!row) return null;
  return {
    date: row.date,
    censorshipPct: row.censorshipPct,
    neutralPct: row.neutralPct,
    totalBlocks: row.totalBlocks,
  };
}

/** Peak / current / trough summary across all history. */
export async function getStatsSummary(): Promise<StatsSummary | null> {
  return summarise(await getTrend());
}

/** The most recent day's per-relay leaderboard, sorted by share descending. */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const [latest] = await db
    .select({ date: dailyStats.date })
    .from(dailyStats)
    .orderBy(desc(dailyStats.date))
    .limit(1);
  if (!latest) return [];

  const rows = await db
    .select()
    .from(relayDailyStats)
    .where(eq(relayDailyStats.date, latest.date));

  return rows
    .map((r) => ({
      relayId: r.relayKey,
      name: classifyRelay(r.relayKey).name,
      posture: classifyRelay(r.relayKey).posture,
      blocks: r.blocks,
      sharePct: r.sharePct,
    }))
    .sort((a, b) => b.sharePct - a.sharePct);
}

/** The latest refresh-log entry — powers the "last updated" indicator. */
export async function getLastRefresh(): Promise<RefreshInfo | null> {
  const [row] = await db
    .select()
    .from(refreshLog)
    .orderBy(desc(refreshLog.ranAt))
    .limit(1);
  if (!row) return null;
  return { ranAt: row.ranAt, status: row.status };
}
```

- [ ] **Step 4: Run it — expect PASS.** `pnpm test src/lib/queries.test.ts`

- [ ] **Step 5: Verify build:** `pnpm build` → succeeds.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: add data-access query layer"`

---

## Task 2: Formatting helpers and Recharts

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `package.json` (add `recharts`)

- [ ] **Step 1: Install Recharts** — `pnpm add recharts` (latest; it supports React 19).

- [ ] **Step 2: Add to `src/lib/format.test.ts`** (append new `describe` blocks, keep existing tests):

```ts
import { formatRelativeTime, formatDateShort } from "./format";

describe("formatRelativeTime", () => {
  it("formats seconds, minutes, hours, days ago", () => {
    const now = new Date("2026-05-21T12:00:00Z");
    expect(formatRelativeTime(new Date("2026-05-21T11:59:30Z"), now)).toBe("30s ago");
    expect(formatRelativeTime(new Date("2026-05-21T11:30:00Z"), now)).toBe("30m ago");
    expect(formatRelativeTime(new Date("2026-05-21T09:00:00Z"), now)).toBe("3h ago");
    expect(formatRelativeTime(new Date("2026-05-18T12:00:00Z"), now)).toBe("3d ago");
  });
});

describe("formatDateShort", () => {
  it("formats an ISO date as MMM 'YY", () => {
    expect(formatDateShort("2022-11-14")).toBe("Nov '22");
  });
});
```

- [ ] **Step 3: Run it — expect FAIL** for the new tests. `pnpm test src/lib/format.test.ts`

- [ ] **Step 4: Append to `src/lib/format.ts`:**

```ts
/** Human-readable "N{unit} ago" from a past date. `now` is injectable for testing. */
export function formatRelativeTime(then: Date, now: Date = new Date()): string {
  const secs = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats an ISO date string ("2022-11-14") as "Nov '22". */
export function formatDateShort(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${MONTHS[Number(month) - 1]} '${year.slice(2)}`;
}
```

- [ ] **Step 5: Run it — expect PASS.** `pnpm test src/lib/format.test.ts`

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: add date formatting helpers and Recharts"`

---

## Tasks 3-11: Section components

Each task ports one section of `mockup-b-terminal.html` to a React component under `src/components/sections/`. **For every component task:** match the mockup's structure and visual style, use Tailwind classes mapped to the design tokens (theme-aware light+dark, never hard-coded hex), use `font-mono` for data/labels and `font-sans` for display headings, and keep it a server component unless interaction is needed. After creating each component, run `pnpm build` to confirm it compiles, then commit. Components receive data via props (typed with the interfaces from `src/lib/queries.ts`) — they do not query the DB themselves.

### Task 3: StatusBar + Header

**Files:** Create `src/components/sections/status-bar.tsx`, `src/components/sections/site-header.tsx`

- [ ] `StatusBar` (server) — props `{ latestDate: string; censorshipPct: number; lastRefresh: Date | null }`. A thin top strip of cells (mockup `.statusbar`): `NETWORK / ETH MAINNET`, `STATUS / ●LIVE` (mint dot), `DATA THROUGH / {latestDate}`, `CENSORSHIP / {censorshipPct}%`, `UPDATED / {formatRelativeTime(lastRefresh)}`. Mono, uppercase, small. Theme-aware borders.
- [ ] `SiteHeader` (server) — the brand lockup (`MEVWATCH // MONITOR` — render the Labrys SVG mark from the mockup) and nav links (`OVERVIEW`, `RELAYS`, `METHODOLOGY`, `API`) pointing to `/`, `/explorer`, `/methodology`, `/embed`. Include the existing `ThemeToggle` component at the right.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add status bar and site header"`

### Task 4: Hero section

**Files:** Create `src/components/sections/hero.tsx`

- [ ] `Hero` (server) — props `{ summary: StatsSummary }`. Ports mockup `.hero`: the `// PUBLIC TRANSPARENCY TOOL` tag, the big stacked headline **"CENSORSHIP / IS / FALLING"** (`font-sans`, extra-bold; "FALLING" in the accent), a stat line showing `{summary.current}%` with a ▼ arrow and `down {(summary.peak - summary.current).toFixed(1)} pts from a {summary.peak}% peak`, and a terminal-style lede box (`$ cat ./readme.md` styling) explaining the tool. Use `formatPercent`.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add hero section"`

### Task 5: Composition section

**Files:** Create `src/components/sections/composition.tsx`

- [ ] `Composition` (server) — props `{ latest: LatestStats }`. Ports mockup section 01 as a **2-way** stacked bar: a `censoring` segment (`bg-ofac`, width `censorshipPct%`) and a `neutral` segment (`bg-neutral-relay`, width `neutralPct%`), with a `0% / 50% / 100%` axis, two legend cells (value + label), and a mint-toned insight row reading e.g. **"Resistance is winning — neutral relays now deliver the majority of MEV-boost blocks."** Section label `01 / POST-MERGE COMPOSITION`.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add composition section"`

### Task 6: Leaderboard section

**Files:** Create `src/components/sections/leaderboard.tsx`

- [ ] `Leaderboard` (server) — props `{ rows: LeaderboardRow[] }`. Ports mockup section 02: a table — rank, relay name + id, a posture badge (`OFAC` in `warn`/`ofac` tone for `censoring`, `NEUTRAL` in `good`/`neutral` tone otherwise, a muted `UNKNOWN` for `unknown`), a share mini-bar + `sharePct`, and `blocks`. Sorted as given (share desc). Section label `02 / RELAY LEADERBOARD`. Mono table styling per the mockup.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add relay leaderboard section"`

### Task 7: "What to do" callout

**Files:** Create `src/components/sections/what-to-do.tsx`

- [ ] `WhatToDo` (server) — no data props. Ports mockup section 03: the `BAD == CENSORSHIP` callout panel, the numbered validator steps (open mev-boost config → remove OFAC relays → add neutral relays → restart & verify), and a share strip (Share on X, Copy link, Embed, Cite). The share strip's "Copy link" and "Embed" may be simple anchor links for now (`/embed` for Embed); the X link is a real `https://twitter.com/intent/tweet` URL. Section label `03 / WHAT TO DO`.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add what-to-do callout section"`

### Task 8: Trend chart

**Files:** Create `src/components/sections/trend-chart.tsx`

- [ ] `TrendChart` (**client** — `"use client"`) — props `{ trend: TrendPoint[]; summary: StatsSummary }`. Ports mockup section 04: a stat header (`NOW`, `PEAK`, `TROUGH` from `summary`) and a Recharts area chart of `censorshipPct` over `date`. Include a range toggle (`ALL` / `1Y` / `90D`) that slices `trend` by date in component state. X-axis labels formatted with `formatDateShort`, Y-axis `0-100%`. Area fill + line in the theme accent. Annotate the peak point. Section label `04 / CENSORSHIP OVER TIME`. Respects `prefers-reduced-motion` (Recharts `isAnimationActive` off when reduced).
- [ ] `pnpm build`, then commit: `git commit -m "feat: add censorship trend chart"`

### Task 9: Composition grid

**Files:** Create `src/components/sections/composition-grid.tsx`

- [ ] `CompositionGrid` (server) — props `{ latest: LatestStats }`. Ports mockup section 05's tile grid, but as a **ratio visual**: render a fixed grid (e.g. 16×8 = 128 tiles); colour `round(censorshipPct/100 * 128)` tiles as `ofac` and the rest as `neutral-relay`. Header text makes clear this is the current censoring/neutral ratio, not a live block stream. Section label `05 / BLOCK COMPOSITION`. A footnote notes a live per-block stream is planned.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add composition ratio grid"`

### Task 10: FAQ section

**Files:** Create `src/components/sections/faq.tsx`, `src/config/faq.ts`

- [ ] Create `src/config/faq.ts` exporting `FAQ_ITEMS: { q: string; a: string }[]` — 6 items: What is MEV-Boost?; What does OFAC-compliant mean?; Why does censorship matter?; How is this measured? (explain the share-of-deliveries metric + relayscan.io source); What should validators do?; Is the data verifiable? Write accurate, current (2026) answers.
- [ ] `Faq` (**client** — uses `<details>`/accordion interaction; may stay server if using native `<details>` with no JS — prefer native `<details>` so it can be a server component). Ports mockup section 06: a two-column grid of `<details>` accordions from `FAQ_ITEMS`. Section label `06 / FAQ`.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add FAQ section"`

### Task 11: Footer

**Files:** Create `src/components/sections/site-footer.tsx`

- [ ] `SiteFooter` (server) — ports the mockup footer: brand mark, a short blurb, and Data / Resources / Connect link columns (Methodology → `/methodology`, Embed widget → `/embed`, GitHub → the repo, etc.), and a "made with" Labrys lockup. Use real links where known, `#` placeholders only for genuinely-unknown socials.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add site footer"`

---

## Task 12: Assemble the homepage

**Files:** Modify `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`** — a server component that calls the query layer and composes the sections:

```tsx
import { StatusBar } from "@/components/sections/status-bar";
import { SiteHeader } from "@/components/sections/site-header";
import { Hero } from "@/components/sections/hero";
import { Composition } from "@/components/sections/composition";
import { Leaderboard } from "@/components/sections/leaderboard";
import { WhatToDo } from "@/components/sections/what-to-do";
import { TrendChart } from "@/components/sections/trend-chart";
import { CompositionGrid } from "@/components/sections/composition-grid";
import { Faq } from "@/components/sections/faq";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  getLatestStats,
  getStatsSummary,
  getTrend,
  getLeaderboard,
  getLastRefresh,
} from "@/lib/queries";

// Re-rendered hourly; the refresh job updates the underlying data.
export const revalidate = 3600;

export default async function Home() {
  const [latest, summary, trend, leaderboard, lastRefresh] = await Promise.all([
    getLatestStats(),
    getStatsSummary(),
    getTrend(),
    getLeaderboard(),
    getLastRefresh(),
  ]);

  if (!latest || !summary) {
    return (
      <main className="terminal-grid flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-fg-muted">
          No data yet — run <code>pnpm seed-history</code>.
        </p>
      </main>
    );
  }

  return (
    <div className="terminal-grid min-h-screen">
      <StatusBar
        latestDate={latest.date}
        censorshipPct={latest.censorshipPct}
        lastRefresh={lastRefresh?.ranAt ?? null}
      />
      <div className="mx-auto max-w-[1280px] px-6">
        <SiteHeader />
        <Hero summary={summary} />
        <Composition latest={latest} />
        <Leaderboard rows={leaderboard} />
        <WhatToDo />
        <TrendChart trend={trend} summary={summary} />
        <CompositionGrid latest={latest} />
        <Faq />
      </div>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2:** `pnpm build` → succeeds. Then `pnpm dev`, open `http://localhost:3000`, confirm the page renders with real data (hero shows a real percentage, the chart shows history, the leaderboard lists relays). Stop the dev server.
- [ ] **Step 3: Commit:** `git commit -m "feat: assemble the homepage from real data"`

---

## Task 13: Methodology page

**Files:** Create `src/app/methodology/page.tsx`

- [ ] A server component at `/methodology` — terminal-styled, using `SiteHeader`/`SiteFooter`. Explains, in clear prose: what MEV-Boost and relays are; what "OFAC-censoring" means; the **data source** (relayscan.io); the **metric** (censoring relays' share of MEV-boost relay payload deliveries — and why it is a delivery-share ratio, not a block count); the **OFAC classification** (editorial, in `src/config/relays.ts`); refresh cadence; and honest **limitations** (no per-transaction censorship measurement; non-MEV-boost blocks not counted; posture is editorial). Add page `metadata` (title/description).
- [ ] `pnpm build`, then commit: `git commit -m "feat: add methodology page"`

---

## Task 14: Explorer page

**Files:** Create `src/app/explorer/page.tsx`

- [ ] A server component at `/explorer` — terminal-styled with `SiteHeader`/`SiteFooter`. Calls `getLeaderboard()` and renders the full relay list as a detailed sortable-looking table: relay name, id, posture badge, share %, blocks (latest day). Below the table, a short section listing each relay from `RELAYS` (`src/config/relays.ts`) with its posture — the canonical relay directory. Add page `metadata`.
- [ ] `pnpm build`, then commit: `git commit -m "feat: add relay explorer page"`

---

## Task 15: Embed page

**Files:** Create `src/app/embed/page.tsx`

- [ ] A server component at `/embed` — a compact, standalone card (NO header/footer/status bar) showing the headline metric: current censorship %, the ▼ trend vs. peak, "MEV Watch" wordmark, and a small "mevwatch.info" link. Sized to be iframe-friendly (compact, ~`max-w-md`). Calls `getLatestStats()` + `getStatsSummary()`. Add `metadata` and ensure it renders cleanly in isolation (it shares the root layout's fonts/theme but renders no site chrome).
- [ ] `pnpm build`, then commit: `git commit -m "feat: add embeddable metric card"`

---

## Task 16: E2e tests and full verification

**Files:** Modify `e2e/home.spec.ts`; create `e2e/pages.spec.ts`

- [ ] **Step 1: Replace `e2e/home.spec.ts`** with tests for the real homepage: the page loads; the hero heading is visible; the status bar shows a censorship percentage; the leaderboard table has rows; the trend chart container renders; the theme toggle still flips `html` between `dark` and `light`.
- [ ] **Step 2: Create `e2e/pages.spec.ts`** — smoke tests: `/methodology`, `/explorer`, `/embed` each return < 400 and render their key heading/content.
- [ ] **Step 3: Run the full suite** — `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e` — all must pass. (`pnpm test:e2e` needs the seeded `data/mevwatch.db`; it exists from Phase 2.)
- [ ] **Step 4:** Update `CLAUDE.md` `## Status` to: `Phases 1-3 complete (foundation, data layer, core UI). Phases 4-5 (deploy, iteration) tracked in docs/superpowers/plans/.`
- [ ] **Step 5: Commit:** `git commit -m "test: add homepage and page e2e coverage; Phase 3 verification"`

---

## Done — Phase 3 complete

The dashboard is live locally: a terminal-aesthetic single-page scoreboard reading 766 days of real censorship data, plus the methodology, explorer, and embed pages. Phase 4 wires deployment (Vercel + Turso + cron).
