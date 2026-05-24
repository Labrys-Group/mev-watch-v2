# Instant SSR + Streaming Skeletons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The home page renders its static shell instantly (no JS gating), and each data-driven section streams in via its own Suspense boundary with a skeleton of the exact same shape. Result: above-the-fold content paints immediately from the cached ISR HTML, and any genuinely-pending data shows a shaped skeleton instead of a blank slot.

**Architecture:**
- Page becomes a synchronous server component that renders the shell + a `<Suspense>` boundary per data-driven section. Each boundary's child is a small async server component that fetches its own slice of data and renders the existing presentational component.
- Query functions are wrapped in React `cache()` so two sections asking for the same trend/latest within one render dedupe into one DB call.
- The `<Reveal>` scroll-fade-in wrapper is removed from the home page — its `opacity: 0; translateY(28px)` was the actual reason "loaded" pages looked blank. CSS keyframes that previously needed an `.is-visible` parent (`reveal-item`, `reveal-row`, `grow-bar`, `epoch-tile`) are rewritten to run on mount so the item-level entrance polish survives.
- `TrendChart`'s `inView` Recharts-mount gate **is kept** — the chart sweep is a showcase animation and should still trigger on scroll-into-view. Between data-resolved and `inView` firing, the empty chart well now shows a gray `animate-pulse` placeholder instead of an empty rectangle.
- Empty-DB UX: when a query legitimately returns null (pre-seed local dev), the data wrapper renders a per-section inline empty state that mirrors the parent's frame and shows a "run `pnpm seed-history`" hint. Skeletons are reserved for the loading state.
- ISR (`revalidate = 3600`) is retained — most requests see the fully populated cached HTML, skeletons only flash during cache regeneration or a cold local dev request.

**Tech Stack:** Next.js 16 App Router (server components + streaming Suspense), React `cache()` for per-request memoization, TypeScript, Tailwind CSS v4, Vitest, Recharts.

**Spec:** _(none — this plan addresses a load-performance refactor surfaced in conversation; the user's framing is "everything that isn't data SSRs instantly, data sections cache and otherwise show a shape-matched skeleton".)_

---

## File Structure

- **Modify** `src/lib/queries.ts` — wrap `getTrend`, `getLatestStats`, `getLeaderboard`, `getBuilderLeaderboard`, `getLastRefresh` with React `cache()` so concurrent Suspense children dedupe within one render.
- **Create** `src/components/skeletons/status-bar.skeleton.tsx` — exact-shape skeleton for `<StatusBar>`.
- **Create** `src/components/skeletons/hero.skeleton.tsx` — exact-shape skeleton for `<Hero>`.
- **Create** `src/components/skeletons/composition.skeleton.tsx` — exact-shape skeleton for `<Composition>`.
- **Create** `src/components/skeletons/trend-chart.skeleton.tsx` — exact-shape skeleton for `<TrendChart>`.
- **Create** `src/components/skeletons/leaderboard.skeleton.tsx` — exact-shape skeleton for `<Leaderboard>`.
- **Create** `src/components/skeletons/builder-leaderboard.skeleton.tsx` — exact-shape skeleton for `<BuilderLeaderboard>`.
- **Create** `src/components/sections/status-bar.data.tsx` — async server wrapper; fetches `latest + lastRefresh`, renders `<StatusBar>`.
- **Create** `src/components/sections/hero.data.tsx` — async server wrapper; fetches `trend`, computes verdict, renders `<Hero>`.
- **Create** `src/components/sections/composition.data.tsx` — async server wrapper; fetches `latest`, renders `<Composition latest={latest} />`.
- **Create** `src/components/sections/trend-chart.data.tsx` — async server wrapper; fetches `trend`, renders `<TrendChart trend={trend} />`.
- **Create** `src/components/sections/leaderboard.data.tsx` — async server wrapper; fetches rows, renders `<Leaderboard rows={rows} />`.
- **Create** `src/components/sections/builder-leaderboard.data.tsx` — async server wrapper; fetches rows, renders `<BuilderLeaderboard rows={rows} />`.
- **Modify** `src/app/page.tsx` — remove top-level Promise.all + Reveal wrappers; render shell + `<Suspense>` boundaries.
- **Modify** `src/components/sections/trend-chart.tsx` — keep the `inView` Recharts mount gate; swap the `null` pre-mount fallback for a gray `animate-pulse` chart-shaped placeholder so the well never looks broken.
- **Modify** `src/app/globals.css` — drop the `.is-visible` parent requirement from `reveal-item`, `reveal-row`, `grow-bar`, `epoch-tile` keyframes so they animate on mount.

---

## Task 1: Dedupe query calls with React `cache()`

The Suspense restructure will have two sections calling `getTrend()` (Hero, TrendChart) and two calling `getLatestStats()` (StatusBar, Composition) in the same render pass. React's `cache()` ensures one DB call per query per render.

**Files:**
- Modify: `src/lib/queries.ts:82-215`
- Test: existing `src/lib/queries.test.ts` already covers the query bodies — confirm it still passes.

- [ ] **Step 1: Add the `cache` import**

Open `src/lib/queries.ts`. At the top of the import block, add:

```ts
import { cache } from "react";
```

- [ ] **Step 2: Wrap each query that's called from `page.tsx`**

Wrap the existing `async function` bodies with `cache(async () => …)`. Apply to: `getTrend`, `getLatestStats`, `getLeaderboard`, `getBuilderLeaderboard`, `getLastRefresh`. (`getStatsSummary` is being deleted from the page render path in Task 8, but leave its export intact — it's already a thin wrapper over `getTrend` and gets the benefit transparently. `getRecentRefreshes` takes a `limit` param and isn't on the home page; leave it.)

For example, change:

```ts
export async function getTrend(): Promise<TrendPoint[]> {
  return safeQuery(
    "getTrend",
    async () =>
      db.select({ … }).from(dailyStats).orderBy(dailyStats.date),
    [],
  );
}
```

to:

```ts
export const getTrend = cache(async (): Promise<TrendPoint[]> => {
  return safeQuery(
    "getTrend",
    async () =>
      db.select({ … }).from(dailyStats).orderBy(dailyStats.date),
    [],
  );
});
```

Repeat the same `cache(async () => { … })` transformation for `getLatestStats`, `getLeaderboard`, `getBuilderLeaderboard`, and `getLastRefresh`. Keep the return types annotated on the inner arrow function so the public signature is unchanged.

- [ ] **Step 3: Run the existing query tests to confirm signatures still work**

Run: `pnpm test -- src/lib/queries.test.ts`
Expected: PASS — `cache()` preserves the function signature, just memoizes.

- [ ] **Step 4: Run the type checker for the file**

Run: `pnpm lint`
Expected: PASS — no type errors. `cache()` from React is typed to preserve the wrapped function's signature.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts
git commit -m "perf(queries): wrap page-level queries with React cache() for Suspense dedup"
```

---

## Task 2: `<StatusBarSkeleton>` — exact-shape placeholder

The status bar is a sticky horizontal strip with the Labrys logo cell + 5 status cells. Skeleton matches the same grid + heights so layout doesn't jump when real data swaps in.

**Files:**
- Create: `src/components/skeletons/status-bar.skeleton.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
/**
 * Loading placeholder for <StatusBar>. Matches the real bar's height,
 * grid, and divider geometry so the sticky header never jumps when data
 * swaps in.
 */
export function StatusBarSkeleton() {
  return (
    <div
      className="relative overflow-hidden bg-panel-alt border-b border-border-labrys font-mono text-fg-muted"
      aria-hidden="true"
    >
      <div className="relative z-10 grid grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_repeat(5,1fr)]">
        {/* Logo cell — fixed-width to match the real anchor */}
        <div className="flex items-center border-r border-border-labrys px-3 py-2">
          <span className="block h-[19px] w-[18px] animate-pulse bg-foreground/10" />
        </div>
        {/* 5 status cells; first/third/fifth are md-only on the real bar */}
        <SkeletonCell mdOnly />
        <SkeletonCell />
        <SkeletonCell mdOnly />
        <SkeletonCell />
        <SkeletonCell mdOnly isLast />
      </div>
    </div>
  );
}

function SkeletonCell({ mdOnly, isLast }: { mdOnly?: boolean; isLast?: boolean }) {
  const visibility = mdOnly ? "hidden md:flex" : "flex";
  const divider = isLast ? "" : " border-r border-border-labrys";
  return (
    <div
      className={`${visibility} justify-between items-center gap-3 px-3 py-2${divider}`}
    >
      <span className="block h-[10px] w-12 animate-pulse bg-foreground/10" />
      <span className="block h-[12px] w-16 animate-pulse bg-foreground/10" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/skeletons/status-bar.skeleton.tsx
git commit -m "feat(skeletons): add StatusBarSkeleton placeholder"
```

---

## Task 3: `<HeroSkeleton>` — exact-shape placeholder

Two-column hero — tag + headline left, stat card + readme right. Skeleton uses the same outer border, padding, and lg grid columns so the hero card doesn't reflow.

**Files:**
- Create: `src/components/skeletons/hero.skeleton.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
/**
 * Loading placeholder for <Hero>. Matches the verdict-coloured frame's
 * outer dimensions (border + padding + lg two-column grid) so swapping
 * to the real hero never shifts the layout below.
 */
export function HeroSkeleton() {
  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8"
      aria-hidden="true"
    >
      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        {/* Left column — tag + headline */}
        <div>
          <div className="mb-4 h-[14px] w-48 animate-pulse bg-foreground/10" />
          <div className="space-y-3">
            <div className="h-[clamp(2.4rem,6.7vw,3.85rem)] w-full max-w-[420px] animate-pulse bg-foreground/10" />
            <div className="h-[clamp(2.4rem,6.7vw,3.85rem)] w-3/4 max-w-[320px] animate-pulse bg-foreground/10" />
          </div>
        </div>

        {/* Right column — stat card + readme */}
        <div className="flex h-full flex-col gap-5">
          {/* Stat card — 2px frame placeholder */}
          <div className="flex items-center gap-x-4 border-2 border-border-labrys bg-panel p-4">
            <span className="block h-[clamp(1.7rem,3.4vw,2.1rem)] w-24 shrink-0 animate-pulse bg-foreground/10" />
            <span className="block h-[14px] flex-1 animate-pulse bg-foreground/10" />
          </div>
          {/* Readme box */}
          <div className="mt-auto border border-border-labrys bg-panel p-4">
            <div className="space-y-2">
              <div className="h-[14px] w-full animate-pulse bg-foreground/10" />
              <div className="h-[14px] w-[92%] animate-pulse bg-foreground/10" />
              <div className="h-[14px] w-[60%] animate-pulse bg-foreground/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/skeletons/hero.skeleton.tsx
git commit -m "feat(skeletons): add HeroSkeleton placeholder"
```

---

## Task 4: `<CompositionSkeleton>` — exact-shape placeholder

Composition has a `Section` frame with header label/title, an epoch-ledger row (4 epoch tiles wide), a legend strip, and two stat tiles in a 2-col grid.

**Files:**
- Create: `src/components/skeletons/composition.skeleton.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
/**
 * Loading placeholder for <Composition>. Mirrors the Section frame +
 * epoch-ledger row + legend strip + two stat tiles. The ledger row uses
 * a fixed pixel height matching the real EpochLedger so the page body
 * doesn't jump when data swaps in.
 */
export function CompositionSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        {/* Epoch ledger placeholder — fixed-height row */}
        <div className="border border-border-labrys bg-background p-3">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[120px] animate-pulse bg-foreground/5"
              />
            ))}
          </div>
        </div>
        {/* Legend strip placeholder */}
        <div className="flex items-center gap-4 border border-t-0 border-border-labrys px-4 py-2.5">
          <span className="h-[10px] w-24 animate-pulse bg-foreground/10" />
          <span className="h-[10px] w-20 animate-pulse bg-foreground/10" />
          <span className="h-[10px] w-28 animate-pulse bg-foreground/10" />
        </div>
        {/* Two stat tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="border border-border-labrys bg-background p-3.5"
            >
              <div className="h-[10px] w-36 animate-pulse bg-foreground/10" />
              <div className="mt-2.5 h-[30px] w-24 animate-pulse bg-foreground/10" />
              <div className="mt-1.5 h-[10px] w-28 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Shared Section-frame header skeleton — label + title line + aside slot. */
export function SectionHeaderSkeleton() {
  return (
    <header className="relative flex items-end justify-between gap-4 border-b border-border-labrys px-4 py-3 md:px-5 md:py-3.5">
      <div>
        <div className="h-[10px] w-44 animate-pulse bg-foreground/10" />
        <div className="mt-1.5 h-[18px] w-56 animate-pulse bg-foreground/10 md:h-[21px] md:w-72" />
      </div>
      <div className="hidden sm:block">
        <div className="h-[10px] w-32 animate-pulse bg-foreground/10" />
        <div className="mt-1 h-[10px] w-40 animate-pulse bg-foreground/10" />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/skeletons/composition.skeleton.tsx
git commit -m "feat(skeletons): add CompositionSkeleton placeholder"
```

---

## Task 5: `<TrendChartSkeleton>` — exact-shape placeholder

TrendChart has a 3-col stat row (NOW / PEAK / TROUGH), a range toggle + legend row, and a chart well sized `h-[260px] sm:h-[300px]`.

**Files:**
- Create: `src/components/skeletons/trend-chart.skeleton.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
import { SectionHeaderSkeleton } from "@/components/skeletons/composition.skeleton";

/**
 * Loading placeholder for <TrendChart>. Mirrors the recessed chart well
 * — 3-col stat header, range toggle + legend row, and the same chart
 * height (260px / 300px sm+) so the page doesn't reflow on data arrival.
 */
export function TrendChartSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        <div className="border border-border-labrys bg-background">
          {/* 3-col stat header */}
          <div className="grid grid-cols-3 border-b border-border-labrys">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`p-3 ${i < 2 ? "border-r border-border-labrys" : ""}`}
              >
                <div className="h-[10px] w-12 animate-pulse bg-foreground/10" />
                <div className="mt-1 h-[18px] w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          {/* Range toggle + legend row */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <div className="inline-flex border border-border-labrys">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-[26px] w-12 animate-pulse bg-foreground/10 ${i < 2 ? "border-r border-border-labrys" : ""}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="h-[10px] w-20 animate-pulse bg-foreground/10" />
              <span className="h-[10px] w-16 animate-pulse bg-foreground/10" />
              <span className="h-[10px] w-24 animate-pulse bg-foreground/10" />
            </div>
          </div>
          {/* Chart well — exact same height as the real chart */}
          <div className="h-[260px] px-2 pb-2 pt-4 sm:h-[300px]">
            <div className="h-full w-full animate-pulse bg-foreground/5" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/skeletons/trend-chart.skeleton.tsx
git commit -m "feat(skeletons): add TrendChartSkeleton placeholder"
```

---

## Task 6: `<LeaderboardSkeleton>` + `<BuilderLeaderboardSkeleton>`

Both leaderboards share the same Section frame, an intro paragraph, and a table. Eight placeholder rows is plenty — the real list is usually 5-8 rows.

**Files:**
- Create: `src/components/skeletons/leaderboard.skeleton.tsx`
- Create: `src/components/skeletons/builder-leaderboard.skeleton.tsx`

- [ ] **Step 1: Create the relay leaderboard skeleton**

```tsx
import { SectionHeaderSkeleton } from "@/components/skeletons/composition.skeleton";

const ROWS = 8;

/**
 * Loading placeholder for <Leaderboard>. Five-column table — rank,
 * relay, posture badge, share bar+percent, blocks. Eight rows keeps
 * the section height close to the real list, avoiding reflow on swap.
 */
export function LeaderboardSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        {/* Caption */}
        <div className="mb-3 border-b border-border-labrys pb-3">
          <div className="h-[13px] w-72 animate-pulse bg-foreground/10" />
        </div>
        {/* Table */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="w-full">
            {/* Header strip */}
            <div className="grid grid-cols-[36px_1fr_96px_140px_120px] gap-2 border-b border-t border-border-labrys bg-panel-alt px-2 py-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[10px] w-12 animate-pulse bg-foreground/10"
                />
              ))}
            </div>
            {/* Body rows */}
            {Array.from({ length: ROWS }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[36px_1fr_96px_140px_120px] items-center gap-2 border-b border-border-labrys px-2 py-2.5"
              >
                <span className="h-[12px] w-6 animate-pulse bg-foreground/10" />
                <span className="h-[14px] w-40 animate-pulse bg-foreground/10" />
                <span className="h-[18px] w-16 animate-pulse bg-foreground/10" />
                <span className="h-[6px] w-[88px] animate-pulse bg-foreground/10" />
                <span className="ml-auto h-[12px] w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create the builder leaderboard skeleton**

```tsx
import { SectionHeaderSkeleton } from "@/components/skeletons/composition.skeleton";

const ROWS = 8;

/**
 * Loading placeholder for <BuilderLeaderboard>. Four-column table —
 * rank, builder id, share bar+percent, blocks.
 */
export function BuilderLeaderboardSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        <div className="mb-3 border-b border-border-labrys pb-3">
          <div className="h-[13px] w-72 animate-pulse bg-foreground/10" />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="w-full">
            <div className="grid grid-cols-[36px_1fr_140px_120px] gap-2 border-b border-t border-border-labrys bg-panel-alt px-2 py-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[10px] w-12 animate-pulse bg-foreground/10"
                />
              ))}
            </div>
            {Array.from({ length: ROWS }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[36px_1fr_140px_120px] items-center gap-2 border-b border-border-labrys px-2 py-2.5"
              >
                <span className="h-[12px] w-6 animate-pulse bg-foreground/10" />
                <span className="h-[14px] w-56 animate-pulse bg-foreground/10" />
                <span className="h-[6px] w-[88px] animate-pulse bg-foreground/10" />
                <span className="ml-auto h-[12px] w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/skeletons/leaderboard.skeleton.tsx src/components/skeletons/builder-leaderboard.skeleton.tsx
git commit -m "feat(skeletons): add Leaderboard + BuilderLeaderboard placeholders"
```

---

## Task 7: Drop the `.is-visible` parent requirement from entrance animations

Several keyframes are gated by `.is-visible .reveal-item`, `.is-visible .reveal-row`, `.is-visible .grow-bar`, `.is-visible .epoch-tile`. With `<Reveal>` removed from the home page, those selectors will never match and the items will sit at their initial keyframe state (which uses `backwards`, so they're visible) but the entrance animation won't run. Fix the selectors to apply directly so the staggered fade-up / row reveal / bar grow runs on mount.

**Files:**
- Modify: `src/app/globals.css:264-296` (the `.is-visible …` rules and the `.is-visible .epoch-tile` rule)

- [ ] **Step 1: Find the affected rules**

Run: `pnpm exec grep -n "is-visible" src/app/globals.css`
Expected: lines around 264-296 plus the reduced-motion block around 380-389.

- [ ] **Step 2: Drop the `.is-visible` parent selector for animation rules**

In `src/app/globals.css`, change these four rules (around lines 264-296):

```css
.is-visible .grow-bar {
  animation: mw-bar-grow 1s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: var(--delay, 140ms);
}
.is-visible .reveal-item {
  animation: mw-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: var(--delay, 0ms);
}
.is-visible .reveal-row {
  animation: mw-fade-in 0.5s ease-out backwards;
  animation-delay: var(--delay, 0ms);
}
```

to:

```css
.grow-bar {
  animation: mw-bar-grow 1s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: var(--delay, 140ms);
}
.reveal-item {
  animation: mw-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: var(--delay, 0ms);
}
.reveal-row {
  animation: mw-fade-in 0.5s ease-out backwards;
  animation-delay: var(--delay, 0ms);
}
```

And change:

```css
.is-visible .epoch-tile {
  animation: mw-tile-pop 0.52s cubic-bezier(0.34, 1.4, 0.5, 1) backwards;
  /* +400ms base so the pop fires after the parent .reveal fade-up is mostly
     complete — without it, the pop runs against a 0→1 opacity parent and is
     visually masked. */
  animation-delay: calc(400ms + var(--delay, 0ms));
}
```

to (drop the +400ms offset — there's no parent fade-up to wait for any more):

```css
.epoch-tile {
  animation: mw-tile-pop 0.52s cubic-bezier(0.34, 1.4, 0.5, 1) backwards;
  animation-delay: var(--delay, 0ms);
}
```

- [ ] **Step 3: Update the reduced-motion block accordingly**

In the same file (around lines 380-389), find:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal,
  .reveal.is-visible {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  ...
  .cursor-blink,
  .status-sheen,
  .is-visible .grow-bar,
  .is-visible .reveal-item,
  .is-visible .reveal-row,
  .is-visible .tile,
  .epoch-tile {
    animation: none !important;
  }
}
```

Strip the `.is-visible` prefix from the listed selectors so the reduced-motion override still matches:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal,
  .reveal.is-visible {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  ...
  .cursor-blink,
  .status-sheen,
  .grow-bar,
  .reveal-item,
  .reveal-row,
  .tile,
  .epoch-tile {
    animation: none !important;
  }
}
```

(Leave the `.reveal` / `.reveal.is-visible` opacity override alone — methodology and status pages still use `<Reveal>`.)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "fix(css): run entrance animations without Reveal's is-visible parent"
```

---

## Task 8: Chart-well placeholder for the pre-mount state

The `inView` gate stays — the area sweep is a showcase animation and should still trigger when the chart scrolls into view. But the current pre-mount fallback (`null`) leaves the chart well looking like a hollow rectangle once data has resolved but Recharts hasn't mounted. Swap the `null` for a gray pulse placeholder so the well reads as "loading chart" until intersection.

**Files:**
- Modify: `src/components/sections/trend-chart.tsx:246-247`

- [ ] **Step 1: Replace the `null` fallback with a placeholder div**

In `src/components/sections/trend-chart.tsx`, find the chart well JSX (around line 246):

```tsx
<div ref={chartRef} className="w-full h-[260px] sm:h-[300px] px-2 pt-4 pb-2">
  {inView ? (
    <ResponsiveContainer width="100%" height="100%">
      ...
    </ResponsiveContainer>
  ) : null}
</div>
```

Change the `: null` branch to render a gray pulse placeholder that fills the well:

```tsx
<div ref={chartRef} className="w-full h-[260px] sm:h-[300px] px-2 pt-4 pb-2">
  {inView ? (
    <ResponsiveContainer width="100%" height="100%">
      ...
    </ResponsiveContainer>
  ) : (
    <div
      className="h-full w-full animate-pulse bg-foreground/5"
      aria-hidden="true"
    />
  )}
</div>
```

(Keep the `ref={chartRef}`, the `<AreaChart>` body, and the `inView` state + IntersectionObserver effect untouched — the gate is preserved.)

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/trend-chart.tsx
git commit -m "feat(trend-chart): show pulse placeholder in well until Recharts mounts on scroll"
```

---

## Task 9: Per-section async data wrappers (with inline empty states)

One small async server component per data-driven section. Each fetches its own data and renders the existing presentational component. When the query legitimately returns null/empty (pre-seed local dev), the wrapper renders an inline empty state that mirrors the parent's exact frame and surfaces a "run `pnpm seed-history`" hint. Skeletons (used as Suspense fallbacks in Task 10) are reserved for the loading state — they are NOT used as empty-state fallbacks here.

Leaderboard and BuilderLeaderboard need no empty-state branch: their presentational components already render a built-in "No relay/builder data available" row when given an empty array. So those two wrappers stay trivial.

**Files:**
- Create: `src/components/sections/status-bar.data.tsx`
- Create: `src/components/sections/hero.data.tsx`
- Create: `src/components/sections/composition.data.tsx`
- Create: `src/components/sections/trend-chart.data.tsx`
- Create: `src/components/sections/leaderboard.data.tsx`
- Create: `src/components/sections/builder-leaderboard.data.tsx`

- [ ] **Step 1: StatusBar data wrapper (with inline empty state)**

Create `src/components/sections/status-bar.data.tsx`:

```tsx
import { StatusBar } from "@/components/sections/status-bar";
import { getLatestStats, getLastRefresh } from "@/lib/queries";

export async function StatusBarData() {
  const [latest, lastRefresh] = await Promise.all([
    getLatestStats(),
    getLastRefresh(),
  ]);

  // Pre-seed local dev: surface the seed hint directly in the sticky bar so
  // the dev knows why everything else is empty.
  if (!latest) {
    return (
      <div
        className="relative overflow-hidden border-b border-border-labrys bg-panel-alt font-mono text-fg-muted"
        role="status"
      >
        <div className="flex items-center gap-3 px-3 py-2 text-[12px] tracking-[0.1em] uppercase">
          <span className="text-warn">DB EMPTY</span>
          <span className="normal-case tracking-normal text-foreground">
            run <code className="font-mono">pnpm seed-history</code> to backfill snapshots
          </span>
        </div>
      </div>
    );
  }

  return (
    <StatusBar
      latestDate={latest.date}
      censorshipPct={latest.censorshipPct}
      lastRefresh={lastRefresh?.ranAt ?? null}
    />
  );
}
```

- [ ] **Step 2: Hero data wrapper (with inline empty state)**

Create `src/components/sections/hero.data.tsx`:

```tsx
import { Hero } from "@/components/sections/hero";
import { getTrend } from "@/lib/queries";
import { computeHeroVerdict } from "@/lib/hero-verdict";

export async function HeroData() {
  const trend = await getTrend();

  // Pre-seed local dev: the verdict math would render "CONTAINED 0%" which is
  // misleading. Show an honest empty-state hero card instead.
  if (trend.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8">
        <div className="mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-fg-muted">
          <span aria-hidden="true">{"// "}</span>NO DATA YET
        </div>
        <h1
          className="m-0 font-sans font-extrabold leading-[0.95] tracking-[-0.035em] text-foreground"
          style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
        >
          Database is empty.
        </h1>
        <p className="mt-6 font-mono text-[13px] leading-snug text-fg-muted">
          Run{" "}
          <code className="font-mono text-foreground">pnpm seed-history</code>{" "}
          to backfill daily snapshots, then reload.
        </p>
      </section>
    );
  }

  const verdict = computeHeroVerdict(trend);
  return <Hero verdict={verdict} />;
}
```

- [ ] **Step 3: Composition data wrapper (with inline empty state)**

Create `src/components/sections/composition.data.tsx`:

```tsx
import { Composition } from "@/components/sections/composition";
import { getLatestStats } from "@/lib/queries";
import { Section } from "@/components/section";

export async function CompositionData() {
  const latest = await getLatestStats();

  if (!latest) {
    return (
      <Section
        label="01 / POST-MERGE COMPOSITION"
        title="Censoring vs. neutral relays."
        pattern="line-grid"
        accent="var(--accent-alt-color)"
      >
        <p className="font-mono text-[13px] leading-snug text-fg-muted">
          No daily snapshots yet — run{" "}
          <code className="font-mono text-foreground">pnpm seed-history</code>{" "}
          to backfill, then reload.
        </p>
      </Section>
    );
  }

  return <Composition latest={latest} />;
}
```

- [ ] **Step 4: TrendChart data wrapper (with inline empty state)**

Create `src/components/sections/trend-chart.data.tsx`:

```tsx
import { TrendChart } from "@/components/sections/trend-chart";
import { getTrend } from "@/lib/queries";
import { Section } from "@/components/section";

export async function TrendChartData() {
  const trend = await getTrend();

  if (trend.length === 0) {
    return (
      <Section
        label="02 / CENSORSHIP OVER TIME"
        title="Censorship % since the Merge."
        pattern="diagonal-hatch"
        accent="var(--warn)"
      >
        <p className="font-mono text-[13px] leading-snug text-fg-muted">
          No daily snapshots yet — run{" "}
          <code className="font-mono text-foreground">pnpm seed-history</code>{" "}
          to backfill, then reload.
        </p>
      </Section>
    );
  }

  return <TrendChart trend={trend} />;
}
```

- [ ] **Step 5: Leaderboard data wrapper**

Create `src/components/sections/leaderboard.data.tsx`:

```tsx
import { Leaderboard } from "@/components/sections/leaderboard";
import { getLeaderboard } from "@/lib/queries";

// Empty array is fine — <Leaderboard> renders its own "No relay data
// available" row when rows.length === 0.
export async function LeaderboardData() {
  const rows = await getLeaderboard();
  return <Leaderboard rows={rows} />;
}
```

- [ ] **Step 6: BuilderLeaderboard data wrapper**

Create `src/components/sections/builder-leaderboard.data.tsx`:

```tsx
import { BuilderLeaderboard } from "@/components/sections/builder-leaderboard";
import { getBuilderLeaderboard } from "@/lib/queries";

// Empty array is fine — <BuilderLeaderboard> renders its own "No builder
// data available" row when rows.length === 0.
export async function BuilderLeaderboardData() {
  const rows = await getBuilderLeaderboard();
  return <BuilderLeaderboard rows={rows} />;
}
```

- [ ] **Step 7: Run lint and typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/sections/status-bar.data.tsx src/components/sections/hero.data.tsx src/components/sections/composition.data.tsx src/components/sections/trend-chart.data.tsx src/components/sections/leaderboard.data.tsx src/components/sections/builder-leaderboard.data.tsx
git commit -m "feat(sections): add async data wrappers with inline empty states for Suspense streaming"
```

---

## Task 10: Restructure `page.tsx` — synchronous shell + Suspense boundaries

The home page becomes a synchronous server component. The shell (sticky header + container + static sections + footer) renders instantly. Each data-driven section is wrapped in `<Suspense fallback={<XSkeleton />}>` with its async data component as the child.

**Files:**
- Modify: `src/app/page.tsx` (full rewrite — it's small)

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
import { Suspense } from "react";

import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { WhatToDo } from "@/components/sections/what-to-do";
import { Faq } from "@/components/sections/faq";

import { StatusBarData } from "@/components/sections/status-bar.data";
import { HeroData } from "@/components/sections/hero.data";
import { CompositionData } from "@/components/sections/composition.data";
import { TrendChartData } from "@/components/sections/trend-chart.data";
import { LeaderboardData } from "@/components/sections/leaderboard.data";
import { BuilderLeaderboardData } from "@/components/sections/builder-leaderboard.data";

import { StatusBarSkeleton } from "@/components/skeletons/status-bar.skeleton";
import { HeroSkeleton } from "@/components/skeletons/hero.skeleton";
import { CompositionSkeleton } from "@/components/skeletons/composition.skeleton";
import { TrendChartSkeleton } from "@/components/skeletons/trend-chart.skeleton";
import { LeaderboardSkeleton } from "@/components/skeletons/leaderboard.skeleton";
import { BuilderLeaderboardSkeleton } from "@/components/skeletons/builder-leaderboard.skeleton";

// Re-rendered hourly; the refresh job updates the underlying data.
export const revalidate = 3600;

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Status bar + nav stay pinned together as you scroll */}
      <div className="sticky top-0 z-50">
        <Suspense fallback={<StatusBarSkeleton />}>
          <StatusBarData />
        </Suspense>
        <SiteHeader />
      </div>
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="space-y-4 py-5">
          <Suspense fallback={<HeroSkeleton />}>
            <HeroData />
          </Suspense>
          <Suspense fallback={<CompositionSkeleton />}>
            <CompositionData />
          </Suspense>
          <Suspense fallback={<TrendChartSkeleton />}>
            <TrendChartData />
          </Suspense>
          <WhatToDo />
          <Suspense fallback={<LeaderboardSkeleton />}>
            <LeaderboardData />
          </Suspense>
          <Suspense fallback={<BuilderLeaderboardSkeleton />}>
            <BuilderLeaderboardData />
          </Suspense>
          <Faq />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
```

Notes on what changed:
- No more `async` on the page export — the shell renders instantly.
- No top-level `Promise.all` — each data wrapper begins its own fetch as soon as the page renders, so they still parallelize.
- No more `<Reveal>` wrappers — the SSR'd HTML is visible without waiting for JS hydration + intersection.
- The empty-data check (`if (!latest || !summary) return <main>No data…</main>`) is now distributed across each data wrapper as a per-section inline empty state (see Task 9). Each surface renders a section-shaped "run `pnpm seed-history`" hint when its query returns null/empty, instead of a stuck skeleton.
- `getStatsSummary` is no longer called — Hero uses `computeHeroVerdict(trend)` directly inside `HeroData`.

- [ ] **Step 2: Run lint + typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Run the test suite**

Run: `pnpm test`
Expected: all existing tests PASS. (Nothing should break — page.tsx isn't unit-tested, and the components/queries it uses are unchanged.)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "perf(home): render shell synchronously; stream data sections via Suspense"
```

---

## Task 11: Verify end-to-end

Two parts: a fresh local dev render (confirms skeletons + visible-on-load behavior in the worst case — no cache) and a production-style build (confirms ISR still works and types are happy).

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server starts on http://localhost:3000.

- [ ] **Step 2: Hard-refresh the home page in a browser**

Open http://localhost:3000 with devtools open and the network tab set to "disable cache". On a fresh hard-refresh:
- The Labrys nav + WhatToDo + FAQ + footer should be visible **instantly** (no fade-up wait).
- Each data-driven section should either show its Suspense skeleton (matching the section's outer dimensions) or the populated data — never a blank gap and never a layout shift between skeleton and real content.
- The TrendChart populated state should show populated stats + range toggle + legend, but the chart well shows a gray pulse placeholder until you scroll the chart into view. When the chart well intersects, Recharts mounts and the area-sweep animation plays. Verify the sweep timing still feels right.
- The trend chart range toggle (ALL / 1Y / 90D) updates NOW / PEAK / TROUGH immediately on click (regression check for the earlier CountUp bug).
- If you point the dev server at an empty DB (rename your local sqlite file, or use a fresh dev env), each data section should render its inline empty state with the `pnpm seed-history` hint — not a stuck skeleton.

If any section flashes blank before its skeleton or causes a layout jump, fix the skeleton dimensions to match the real component before continuing.

- [ ] **Step 3: Production build**

Stop the dev server. Run: `pnpm build`
Expected: build succeeds. Look at the build summary — the home `/` route should still be marked as ISR / revalidated (●/ISR icon in the route table) since `revalidate = 3600` is preserved.

- [ ] **Step 4: Run the production server and verify**

Run: `pnpm start`
Open http://localhost:3000. First hit may regenerate; refresh once. Expected: fully populated HTML on the second hit — skeletons never visible because ISR served the cached render.

- [ ] **Step 5: Run e2e tests if they cover the home page**

Run: `pnpm test:e2e`
Expected: PASS. (If a test was timing-out waiting for `<Reveal>` opacity transitions, it should now pass faster. If a test was asserting on `.reveal.is-visible` class presence, update it to assert on the content directly — the wrapper is gone.)

- [ ] **Step 6: Final commit (only if you made any verification-driven tweaks)**

If verification surfaced a skeleton-shape mismatch and you adjusted it:

```bash
git add <files>
git commit -m "fix(skeletons): match <section> dimensions after visual review"
```

Otherwise: nothing to commit — the plan is complete.

---

## Notes for the executor

- The methodology and status pages (`src/app/methodology/page.tsx`, `src/app/status/page.tsx`) still use `<Reveal>` — leave them alone. This plan only changes the home page's load behavior.
- `<Reveal>` and its CSS class `.reveal` (with the opacity-0 transition) stay in the codebase — they're still used by the other two pages.
- `getStatsSummary` is no longer called from `page.tsx` but it's still exported and tested. Leave it — it may be used by the API routes or future pages, and removing it isn't part of this refactor.
- If you find that one of the data wrappers throws (e.g. the DB is unreachable during dev), the existing `safeQuery` fallback inside each query already returns an empty array / null; the skeleton stays up or the section renders empty. This is the intended behavior — failing soft per the comment in `queries.ts:62-67`.
- The Suspense fallback only renders if the data fetch suspends (cold render, cache miss, or dev mode). With `revalidate = 3600` the production response is fully populated HTML and the skeletons never paint.
