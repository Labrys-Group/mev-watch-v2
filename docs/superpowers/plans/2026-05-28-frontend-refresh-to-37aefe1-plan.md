# Frontend Refresh to `37aefe1` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll the user-visible frontend of MEV Watch v2 back to the look + content of commit `37aefe1` (last `joshroyLabrys` commit), in place on the new `front-end-refresh` branch from `origin/main`, without touching backend / data-pipeline code Justin Taylor shipped on top.

**Architecture:** Per-component restyle, not file revert. Each task takes one logical UI surface, reads `git show 37aefe1:<file>` as the visual + copy target, keeps the new props / data-shape wiring from origin/main, and reverts the JSX, class names, and copy. The single non-trivial port is the epoch ledger, where 37aefe1's source referenced the deleted `src/lib/epochs/*` module — the restored interactive layer is wired to the new `src/lib/live-ledger/types` shape.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 + shadcn/ui (radix-nova), Recharts, Vitest, Playwright, pnpm.

**Branch state at plan-write time:** `front-end-refresh` at `7c61243` (4 spec commits on top of `origin/main` / `ee9fae0`). Local working tree matches `origin/main`.

**Spec:** `docs/superpowers/specs/2026-05-28-frontend-refresh-to-37aefe1-design.md`. Read it before starting — it explains the *why* behind every revert and the three "keep Justin's wording" exceptions in methodology.

---

## Workflow conventions for every task

- **Target reference:** `git show 37aefe1:<path>` — always read this first to see the exact look and copy.
- **Current state:** read the working tree file with the Read tool — it matches `origin/main`.
- **Tests sit beside source** (e.g. `hero.test.tsx` next to `hero.tsx`). If a test asserts on copy you change, update the test in the same commit.
- **Run targeted tests, then a full sweep:**
  - After each task: `pnpm test -- <test-file-glob>` for the files you touched.
  - Final task: `pnpm lint && pnpm test && pnpm build`.
- **Commit messages** are pre-written in each task's final step. Use them verbatim — the convention matches `git log`.
- **Don't push** until the final task. Push + PR happens once, after full verification.

---

## Task 0: Pre-flight sanity check

**Files:** (read-only)

- [ ] **Step 1: Confirm branch + clean tree**

Run:
```
git branch --show-current
git status
```
Expected: `front-end-refresh`, clean working tree.

- [ ] **Step 2: Confirm 37aefe1 is reachable**

Run: `git show --stat 37aefe1 | head -5`
Expected: `commit 37aefe112cefb92a126c0fa2f9259223a063053c` by `joshroyLabrys`.

- [ ] **Step 3: Confirm dev tooling works**

Run: `pnpm install` (idempotent), then `pnpm lint`. Expected: lint passes on the untouched origin/main state. If lint fails on a file you haven't touched, stop and surface — that's a baseline issue separate from this branch.

---

## Task 1: refactor(hero) — revert stat card + readme, keep freshness wiring

**Spec reference:** Per-file plan table → Hero rows.

**Files:**
- Modify: `src/components/sections/hero.tsx`
- Modify: `src/components/sections/hero.data.tsx`
- Modify: `src/components/sections/hero.test.tsx` (if test asserts on reverted copy)

- [ ] **Step 1: Read the target**

Run:
```
git show 37aefe1:src/components/sections/hero.tsx
git show 37aefe1:src/components/sections/hero.data.tsx
```
Note the exact stat-card markup and readme copy in 37aefe1 — you'll restore these literally. Note that 37aefe1's `HeroProps` is `{ verdict }` only (no `freshness`).

- [ ] **Step 2: Read current state**

Read `src/components/sections/hero.tsx` and `src/components/sections/hero.data.tsx`.

- [ ] **Step 3: Edit `hero.tsx`**

Keep:
- The `HeroProps` signature `{ verdict, freshness }` — don't remove `freshness` from the props shape (`hero.data.tsx` is still passing it).
- All `import` statements for `CSSVars`, `HeroVerdict`, `DataFreshness`, `CountUp`.

Remove:
- The `isStale` and `sourceBadge` local computations.
- The "Daily data through X" badge JSX that wraps `verdict.message` (look for the conditional `{sourceBadge ? <span … /> : null}` block in the stat card).
- All `isStale` conditional rendering in the readme box.

Restore:
- The stat card's simple `<p>{verdict.message}</p>` (or whatever 37aefe1 had — match it literally).
- The readme box hardcoded copy as in 37aefe1.

Suppress the unused-prop lint for `freshness` only if ESLint complains; otherwise leave it in the signature as a kept-but-unused prop (the parent still passes it).

- [ ] **Step 4: Edit `hero.data.tsx`**

Keep:
- The `Promise.all` with `getLatestStats`, `getLastRefresh`, `getTrend`, and the `getDataFreshness` computation.
- Passing `freshness` to `<Hero …>`.

Revert:
- The empty-state error message's seed command from `pnpm update-data` to `pnpm seed-history` (match 37aefe1 wording exactly).

- [ ] **Step 5: Run hero tests**

Run: `pnpm test -- src/components/sections/hero`

If any test asserts on the removed badge text or the new readme conditional, edit the test to assert the reverted copy. Re-run until green.

- [ ] **Step 6: Commit**

```
git add src/components/sections/hero.tsx src/components/sections/hero.data.tsx src/components/sections/hero.test.tsx
git commit -m "refactor(hero): revert to 37aefe1 stat card + readme copy; keep freshness wiring"
```

---

## Task 2: refactor(status-bar) — revert mobile grid + LIVE cell

**Spec reference:** Per-file plan table → status-bar rows.

**Files:**
- Modify: `src/components/sections/status-bar.tsx`
- Modify: `src/components/sections/status-bar.data.tsx`
- Modify: `src/components/skeletons/status-bar.skeleton.tsx`
- Modify: `src/components/sections/status-bar.test.tsx` (if needed)

- [ ] **Step 1: Read the targets**

```
git show 37aefe1:src/components/sections/status-bar.tsx
git show 37aefe1:src/components/sections/status-bar.data.tsx
git show 37aefe1:src/components/skeletons/status-bar.skeleton.tsx
```

- [ ] **Step 2: Read current state**

Read all three current files.

- [ ] **Step 3: Edit `status-bar.tsx`**

Keep:
- `StatusBarProps` signature including `freshness: DataFreshness` (parent still passes it).
- Imports.

Revert:
- The mobile grid from `grid-cols-[auto_repeat(3,minmax(0,1fr))]` to `grid-cols-[auto_1fr_1fr]` (or whatever the literal 37aefe1 string was).
- The STATUS cell back to hardcoded `"LIVE"` text, `text-good` class, `bg-good` dot, and `animate-pulse` on the dot — no conditional `isStale`-driven color/text.
- The DATA THROUGH cell back to a single `latestDate` value display — drop the `${sourceAgeDays}d old` badge and the mobile two-line stacking.

Remove from the `StatusCell` interface: the `mobileLabel` optional prop, and any logic that uses it.

- [ ] **Step 4: Edit `status-bar.data.tsx`**

Keep: the `getDataFreshness` computation and passing `freshness` to `<StatusBar>`.

Revert: the empty-state command string from `pnpm update-data` to `pnpm seed-history`.

- [ ] **Step 5: Edit `status-bar.skeleton.tsx`**

Revert the grid to `grid-cols-[auto_1fr_1fr]` so the skeleton matches the reverted live component.

- [ ] **Step 6: Run status-bar tests**

Run: `pnpm test -- src/components/sections/status-bar src/components/skeletons/status-bar`

Update any test that asserts on reverted text/grid. Re-run until green.

- [ ] **Step 7: Commit**

```
git add src/components/sections/status-bar.tsx src/components/sections/status-bar.data.tsx src/components/skeletons/status-bar.skeleton.tsx src/components/sections/status-bar.test.tsx
git commit -m "refactor(status-bar): revert mobile grid + LIVE cell; keep freshness wiring"
```

---

## Task 3: refactor(composition) — restore 2-tile + epoch grid, wire to props

**Spec reference:** Per-file plan table → composition rows. **Read the spec's composition.tsx row carefully — the restored JSX must consume `ledger` + `freshness` props instead of calling `getLiveEpochs()` (which doesn't exist anymore).**

**Files:**
- Modify: `src/components/sections/composition.tsx`
- Modify: `src/components/sections/composition.data.tsx`
- Modify: `src/components/skeletons/composition.skeleton.tsx`
- Modify: `src/components/sections/composition.test.tsx` (if needed)

- [ ] **Step 1: Read the targets**

```
git show 37aefe1:src/components/sections/composition.tsx
git show 37aefe1:src/components/skeletons/composition.skeleton.tsx
```
The 37aefe1 composition takes only `latest: LatestStats`. **You will not match that signature.** You'll restore its visual layout but keep the current `{ latest, ledger, freshness }` shape.

- [ ] **Step 2: Read current state**

Read `src/components/sections/composition.tsx`, `src/components/sections/composition.data.tsx`, `src/components/skeletons/composition.skeleton.tsx`.

- [ ] **Step 3: Edit `composition.tsx`**

Keep:
- Function signature `{ latest, ledger, freshness }` (non-async).
- Imports for `EpochLedger`, `CountUp`, `Section`, types.
- Destructuring `censorshipPct, totalBlocks, neutralPct, nonBoostPct` from `latest`.

Replace the JSX body:
- Drop the 3-band composition view (Censoring relays %, Non-censoring+unknown %, Non-MEV-Boost %).
- Restore the 37aefe1 layout: a `<Section>` with `label="01 / POST-MERGE COMPOSITION"`, `title="Censoring vs. neutral relays."`, and the original `aside` text.
- Inside the Section, restore the epoch-ledger grid block + legend strip + the 2-tile card layout (censoring tile / neutral tile).
- Wire the embedded `<EpochLedger initialData={ledger} />` so it reads from the prop rather than the deleted `getLiveEpochs()`.
- Restore the calculated `censoringBlocks = Math.round((censorshipPct / 100) * totalBlocks)` and `neutralBlocks = totalBlocks - censoringBlocks` for the 2-tile display, matching 37aefe1.

Revert copy:
- "Censoring vs. non-censoring relays" → "Censoring vs. neutral relays"
- "DELIVERIES" → "BLOCKS" anywhere in this file
- Any `freshness.sourceLabel` or "DAILY MEV-BOOST DELIVERY DISTRIBUTION" text in the aside back to 37aefe1's exact aside content.

- [ ] **Step 4: Edit `composition.data.tsx`**

Keep:
- `Promise.all` with `readInitialLedger`, `getLastRefresh`, `getDataFreshness`.
- Passing `ledger` and `freshness` to `<Composition>`.

Revert: title text + fallback command string copy to 37aefe1.

- [ ] **Step 5: Edit `composition.skeleton.tsx`**

Replace the bar-viz skeleton with the 37aefe1 epoch-grid + 2-tile placeholder layout.

- [ ] **Step 6: Run composition tests**

Run: `pnpm test -- src/components/sections/composition src/components/skeletons/composition`

Update any test that asserts on the removed 3-band copy or "DELIVERIES" wording. Re-run until green.

- [ ] **Step 7: Commit**

```
git add src/components/sections/composition.tsx src/components/sections/composition.data.tsx src/components/skeletons/composition.skeleton.tsx src/components/sections/composition.test.tsx
git commit -m "refactor(composition): restore 2-tile + epoch-grid layout; keep ledger/freshness props"
```

---

## Task 4: refactor(trend-chart) — restore ResponsiveContainer + tooltip label

**Spec reference:** Per-file plan table → trend-chart rows.

**Files:**
- Modify: `src/components/sections/trend-chart.tsx`
- Modify: `src/components/sections/trend-chart.data.tsx`

- [ ] **Step 1: Read the targets**

```
git show 37aefe1:src/components/sections/trend-chart.tsx
git show 37aefe1:src/components/sections/trend-chart.data.tsx
```
Note the "SHARE OF ALL BLOCKS" / "OF MEV-BOOST" denominator split — `37aefe1` itself introduced this; preserve it. (The current origin/main also has it; this is a check, not an edit.)

- [ ] **Step 2: Read current state**

Read both files.

- [ ] **Step 3: Edit `trend-chart.tsx`**

Revert the chart sizing:
- Drop the `chartSize` state + the `useEffect` ResizeObserver pattern.
- Drop the `chartReady` state.
- Re-add Recharts `ResponsiveContainer` as the wrapper around `<AreaChart>`. Remove the explicit `width={chartSize.width}` / `height={chartSize.height}` attributes.
- Move the `chartRef` back to the outer container, matching 37aefe1's placement.

Revert tooltip + legend copy:
- "Non-censoring" → "Non-censored" in the tooltip label and legend label.

Preserve the denominator-split sub-labels ("SHARE OF ALL BLOCKS" and "OF MEV-BOOST") — these come from 37aefe1 itself.

- [ ] **Step 4: Edit `trend-chart.data.tsx`**

Revert: fallback command string `pnpm update-data` → `pnpm seed-history`.

- [ ] **Step 5: Run trend-chart tests**

Run: `pnpm test -- src/components/sections/trend-chart`

Update any test that asserts on tooltip/legend "Non-censoring". Re-run until green.

- [ ] **Step 6: Commit**

```
git add src/components/sections/trend-chart.tsx src/components/sections/trend-chart.data.tsx
git commit -m "refactor(trend-chart): restore ResponsiveContainer + revert tooltip label"
```

---

## Task 5: refactor(leaderboards) — revert labels + OFAC/NEUTRAL badges + BLOCKS column

**Spec reference:** Per-file plan table → leaderboard + builder-leaderboard rows.

**Files:**
- Modify: `src/components/sections/leaderboard.tsx`
- Modify: `src/components/sections/builder-leaderboard.tsx`
- Modify: `src/components/sections/leaderboard.test.tsx` (likely)

- [ ] **Step 1: Read the targets**

```
git show 37aefe1:src/components/sections/leaderboard.tsx
git show 37aefe1:src/components/sections/builder-leaderboard.tsx
```

- [ ] **Step 2: Edit `leaderboard.tsx`**

Revert (match 37aefe1 strings exactly):
- Section `label`: `"04 / RELAY LEADERBOARD"` → `"03 / RELAY LEADERBOARD"`
- Title: `"Ranked by delivery share"` → `"Ranked by block share"`
- Caption: `"Top relays by delivery share"` → `"Top relays by share"`
- Column header: `"DELIVERIES"` → `"BLOCKS"`
- Summary count text: `"deliveries"` → `"blocks"` (if it appears)
- Posture badge for censoring relays: `"CENSORING"` → `"OFAC"`
- Posture badge for neutral relays: `"NON-CENSORING"` → `"NEUTRAL"`

- [ ] **Step 3: Edit `builder-leaderboard.tsx`**

Revert section `label`: `"05 / BUILDER LEADERBOARD"` → `"04 / BUILDER LEADERBOARD"`.

- [ ] **Step 4: Run leaderboard tests**

Run: `pnpm test -- src/components/sections/leaderboard src/components/sections/builder-leaderboard`

Update test assertions for "DELIVERIES", "CENSORING", "NON-CENSORING", section labels. Re-run until green.

- [ ] **Step 5: Commit**

```
git add src/components/sections/leaderboard.tsx src/components/sections/builder-leaderboard.tsx src/components/sections/leaderboard.test.tsx
git commit -m "refactor(leaderboards): revert section labels + OFAC/NEUTRAL badges + BLOCKS column"
```

---

## Task 6: refactor(faq) — revert FaqPair + Q5 terminology; keep Q2 expansion

**Spec reference:** Per-file plan table → faq.tsx + config/faq.ts rows.

**Files:**
- Modify: `src/components/sections/faq.tsx`
- Modify: `src/config/faq.ts`
- Modify: `src/components/sections/faq.test.tsx` (likely)

- [ ] **Step 1: Read the targets**

```
git show 37aefe1:src/components/sections/faq.tsx
git show 37aefe1:src/config/faq.ts
```

- [ ] **Step 2: Edit `faq.tsx`**

Revert the component structure from `FaqCard({item, index, isRightCol})` back to `FaqPair({items, startIndex})`:
- Restore the paired-toggle behaviour — both items in a pair share the same open state.
- Restore the grid mapping that iterates over `pairs` of `[left, right]` items.
- Match the 37aefe1 className strings on the grid wrapper, card border, and item content.
- Keep animations and Reveal wrappers identical to 37aefe1.

- [ ] **Step 3: Edit `src/config/faq.ts`**

Two precise edits:

1. **Q5 terminology revert:** find the answer that uses "non-censoring relays" and revert to "neutral relays". Find any other "censoring" / "OFAC-censoring" terminology shifts and revert per 37aefe1 wording — **except** Q2.

2. **Q2 — keep Justin's expanded answer.** The expanded body about OFAC being one censorship regime among many is a content improvement; it stays. Only revert Q2's question wording to 37aefe1's phrasing if it differs.

Diff the two `git show 37aefe1:src/config/faq.ts` and current side-by-side and apply the edits precisely.

- [ ] **Step 4: Run faq tests**

Run: `pnpm test -- src/components/sections/faq src/config/faq`

Update assertions for FaqPair structure, terminology. Re-run until green.

- [ ] **Step 5: Commit**

```
git add src/components/sections/faq.tsx src/config/faq.ts src/components/sections/faq.test.tsx
git commit -m "refactor(faq): revert FaqCard to FaqPair; revert Q5 terminology; keep Q2 expansion"
```

---

## Task 7: refactor(methodology) — terminology + Limitation #4; keep Vercel Blob + relays.json accuracy

**Spec reference:** Per-file plan table → methodology row. **Read the spec's three "keep Justin's wording" exceptions before editing — Data Source paragraph, Limitation #3 `relays.json`, and the Limitation #4 merged-wording proposal.**

**Files:**
- Modify: `src/app/methodology/page.tsx`
- Modify: `src/app/methodology/page.test.tsx` (if any)

- [ ] **Step 1: Read the target + current**

```
git show 37aefe1:src/app/methodology/page.tsx
```
Read `src/app/methodology/page.tsx` (current).

- [ ] **Step 2: Apply global terminology revert**

Globally in `methodology/page.tsx`:
- "OFAC-censoring" → wherever Justin shortened to "censoring" in titles/copy, restore 37aefe1's exact wording.
- "neutral" terminology — restore wherever 37aefe1 said "neutral" or "neutral relays" and Justin shortened to "non-censoring".
- Section label `"05 / RELAY CLASSIFICATION"` → `"05 / OFAC RELAY CLASSIFICATION"`.

Keep:
- The `relay.posture === "neutral" ? "non-censoring" : relay.posture` display transform in the relay table — that's a display tweak that doesn't conflict with the terminology revert because the user-facing label inside the badge will read "non-censoring" while the editorial config still uses "neutral". (Verify against 37aefe1; if 37aefe1 simply rendered the posture string directly, drop the transform too.)

- [ ] **Step 3: Keep three Justin exceptions intact**

Do NOT revert these:

1. **Data Source paragraph** (around the "$ endpoint" callout): the wording "A scheduled Vercel Cron job runs shortly after each UTC day rolls over, fetching the previous day's stats and writing them into a SQLite artifact stored in Vercel Blob. Normal page loads read only that artifact — they do not query relayscan.io." is factually correct. Keep it.

2. **Limitation #3** reference to `relays.json` (not `relays.ts`): the editorial config now lives at `src/data/relays.json` (`src/config/relays.ts` is the validated accessor). Justin's `relays.json` reference is accurate. Keep it.

3. **Limitation #4** — replace it with the spec's merged wording:
   - Title: `"Headline is daily; the live ledger is a separate view"`
   - Body (use this verbatim or adjust prose lightly to read in your voice):
     > "The headline censorship percentage is a daily snapshot. Intra-day changes in relay composition do not move it until the next UTC day's snapshot refresh (now persisted as a SQLite artifact in Vercel Blob). The epoch ledger on the dashboard polls the relays' own data APIs and displays per-slot outcomes on a much shorter refresh window, but is scoped to the last ~1024 slots and is not used to compute the headline percentage."

- [ ] **Step 4: Run methodology tests**

Run: `pnpm test -- src/app/methodology`

Update assertions for any reverted terminology / labels. Re-run until green.

- [ ] **Step 5: Spot-check by reading the page**

Read the full file once after the edits and confirm the prose flows. If anything reads awkwardly because of the merged Limitation #4 wording, rewrite that paragraph lightly so it sounds natural — but preserve the two factual claims (Blob-backed snapshot + live ledger polling).

- [ ] **Step 6: Commit**

```
git add src/app/methodology/page.tsx src/app/methodology/page.test.tsx
git commit -m "refactor(methodology): revert terminology + Limitation #4; keep Vercel Blob + relays.json accuracy"
```

---

## Task 8: refactor(embed) — drop freshness badge; keep shorter title

**Spec reference:** Per-file plan table → embed row.

**Files:**
- Modify: `src/app/embed/page.tsx`
- Modify: `src/app/embed/page.test.tsx` (if any)

- [ ] **Step 1: Read the target + current**

```
git show 37aefe1:src/app/embed/page.tsx
```
Read `src/app/embed/page.tsx` (current).

- [ ] **Step 2: Edit `embed/page.tsx`**

Remove:
- The `getLastRefresh` and `getDataFreshness` imports.
- The `lastRefresh` query from the `Promise.all`.
- The `freshness` const.
- The `<p>...{freshness.sourceLabel}</p>` freshness badge JSX below the metric.

Keep:
- The shorter metadata `title: "Embed"` (Justin's change — fine).
- The reverted description if 37aefe1's description is meaningfully different.

Run `git diff 37aefe1 HEAD -- src/app/embed/page.tsx` after the edit to confirm the diff matches the intended scope.

- [ ] **Step 3: Run embed tests**

Run: `pnpm test -- src/app/embed`

Update assertions for the removed freshness badge. Re-run until green.

- [ ] **Step 4: Commit**

```
git add src/app/embed/page.tsx src/app/embed/page.test.tsx
git commit -m "refactor(embed): drop freshness badge; keep shorter title"
```

---

## Task 9: refactor(what-to-do) — revert step titles + section label

**Spec reference:** Per-file plan table → what-to-do row.

**Files:**
- Modify: `src/components/sections/what-to-do.tsx`

- [ ] **Step 1: Read target + current**

```
git show 37aefe1:src/components/sections/what-to-do.tsx
```
Read `src/components/sections/what-to-do.tsx`.

- [ ] **Step 2: Edit copy**

Revert (literal strings from 37aefe1):
- Section label: `"05 / WHAT TO DO"` → `"03 / WHAT TO DO"`.
- Step 02 title: `"censoring relays"` → `"OFAC-compliant relays"`.
- Step 03 title: `"non-censoring relays"` → `"neutral relays"`.

- [ ] **Step 3: Commit**

```
git add src/components/sections/what-to-do.tsx
git commit -m "refactor(what-to-do): revert step titles + section label"
```

---

## Task 10: feat(epoch-ledger) — restore animations + hover + reconnect, port to live-ledger/types

**Spec reference:** Per-file plan table → epoch-ledger row. **This is the largest task — read the spec's epoch-ledger row carefully. 37aefe1's source referenced the deleted `src/lib/epochs/*` module, so you cannot literally copy it; you'll port the interactive layer to the new `src/lib/live-ledger/types` shapes.**

**Files:**
- Modify: `src/components/sections/epoch-ledger.tsx`
- Modify: `src/components/sections/epoch-ledger.test.tsx` (likely)

- [ ] **Step 1: Read the targets and the new types**

```
git show 37aefe1:src/components/sections/epoch-ledger.tsx
git show 37aefe1:src/lib/epochs/classify.ts
git show 37aefe1:src/lib/epochs/diff.ts
git show 37aefe1:src/lib/epochs/types.ts
```
Capture the 37aefe1 source for: `EpochRowView` subcomponent, `SlotTooltip` portal, `HoverState` interface, `diffLedger` helper, `classifyRelay` usage, polling loop, and reconnection indicator.

Then read the CURRENT new types:
- `src/lib/live-ledger/types.ts` (the working tree file — `SlotCategory`, `SlotCell`, `EpochRow`, `LedgerData` with `headSlot` + `degradedRelays`).
- `src/lib/live-ledger/timing.ts` (the working tree file — `LIVE_LEDGER_REFRESH_INTERVAL_MS`).

Map the type differences:
- Old `FilledCategory` → new `SlotCategory` (drop `"pending"` where it doesn't belong).
- Old `LedgerData` had `relaysOk`/`relaysTotal` — new has `headSlot` + `degradedRelays`. The reconnection indicator should now fire from `degradedRelays.length > 0` or fetch-error state, not from `relaysOk < relaysTotal`.
- Old `SlotCell` shape vs new — confirm `relays`, `category`, `builderPubkey`, `valueWei`, `blockNumber`, `numTx` all present in the new shape (they are).

- [ ] **Step 2: Read current state**

Read `src/components/sections/epoch-ledger.tsx` (working tree).

- [ ] **Step 3: Rewrite `epoch-ledger.tsx`**

Build the file by composing:

**Keep from current (origin/main):**
- The polling loop structure that calls `/api/epochs`.
- The use of `LIVE_LEDGER_REFRESH_INTERVAL_MS` from `live-ledger/timing` — but **change the interval back to 10_000 ms** (declare a local constant `POLL_MS = 10_000` and use it, matching 37aefe1).
- The new type imports from `live-ledger/types`.

**Restore from 37aefe1:**
- `EpochRowView` subcomponent with stagger entry animations (per-slot `--delay` CSS custom properties).
- `SlotTooltip` portal subcomponent (`createPortal` to `document.body`, positioned via mouse coords).
- `HoverState` interface and hover state management — `onMouseEnter` / `onMouseLeave` / `onMouseMove` on each slot tile.
- The diff-based animation logic when epochs shift — port the old `diffLedger` algorithm to operate on the new `LedgerData` shape (it compared old `epochs` arrays slot-by-slot; the new shape's `epochs` array is structurally the same).
- The row-collapse animation (`.epoch-row-wrap--collapsed` class toggled when an old epoch row exits).
- The "Reconnecting…" indicator: render it when the polling fetch fails (track an `isReconnecting` state set on fetch catch, cleared on success).

**Drop entirely:**
- The three new status badges (Cache stale / Degraded relays / Slot CENSORING). Remove the badge JSX block and its surrounding container.
- ARIA roles on the badges (gone with the badges).
- The `title` attribute fallback on slots (replaced by the SlotTooltip portal).

**Hover gating:** Wrap the hover handlers behind `window.matchMedia('(hover: hover) and (pointer: fine)')` at mount, matching 37aefe1 — touch devices get no tooltip.

If the old `classifyRelay` import was for tooltip relay-name display, import `classifyRelay` from `@/config/relays` (still exists).

- [ ] **Step 4: Run epoch-ledger tests**

Run: `pnpm test -- src/components/sections/epoch-ledger`

Update test assertions: remove badge-related expectations, restore hover/tooltip expectations from the 37aefe1 test if it existed. If the current test file expects the new badges, rewrite those expectations to assert the restored interactive behaviour.

- [ ] **Step 5: Local sanity render**

Run: `pnpm dev` and open `http://localhost:3000`. Confirm:
- The epoch ledger grid renders.
- Slots animate in with stagger.
- Hovering a filled slot on desktop shows the tooltip.
- New epoch shifts animate (row-collapse + stagger of new row).
- No "Cache stale" / "Degraded relays" / "Slot CENSORING" badges anywhere.
- If you disconnect the network briefly, the "Reconnecting…" indicator appears.

Stop the dev server (`Ctrl+C`).

- [ ] **Step 6: Commit**

```
git add src/components/sections/epoch-ledger.tsx src/components/sections/epoch-ledger.test.tsx
git commit -m "feat(epoch-ledger): restore animations + hover tooltips + reconnect; drop status badges, port to live-ledger/types"
```

---

## Task 11: style(globals) — restore epoch-ledger animation CSS

**Spec reference:** Per-file plan table → globals.css row.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Read the target**

```
git show 37aefe1:src/app/globals.css
```
Identify the deleted rules: `.epoch-tile`, `.epoch-row-wrap`, `.epoch-row-wrap--collapsed`, related keyframes, and the `@media (prefers-reduced-motion: reduce)` overrides for epoch animations.

- [ ] **Step 2: Read current state**

Read `src/app/globals.css`.

- [ ] **Step 3: Re-paste the deleted rules**

Insert the deleted blocks back at their original positions. Use the literal CSS from 37aefe1 (do not paraphrase — exact class names and keyframe declarations matter).

Before committing, run `grep -n "epoch-tile\\|epoch-row-wrap" src/app/globals.css` to confirm the selectors are present, and `grep -rn "epoch-tile\\|epoch-row-wrap" src/components/` to confirm they're actually being consumed by Task 10's restored component (no orphan CSS).

- [ ] **Step 4: Run a quick build check**

Run: `pnpm build` — must succeed (Tailwind v4 + CSS validation).

- [ ] **Step 5: Commit**

```
git add src/app/globals.css
git commit -m "style(globals): restore epoch-ledger animation rules + reduced-motion overrides"
```

---

## Task 12: chore(skeletons) — re-sync remaining skeletons

**Spec reference:** Per-file plan table → composition.skeleton (already done in Task 3) and status-bar.skeleton (already done in Task 2). This task is for any skeleton not already touched.

**Files:** (sweep — likely none to touch beyond what Tasks 2 and 3 already did, but verify)

- [ ] **Step 1: Sweep skeletons directory**

Run: `ls src/components/skeletons/`. For each file not already touched in Tasks 2/3, run:
```
git diff 37aefe1 HEAD -- src/components/skeletons/<file>
```
If there's a delta, decide: does the skeleton match the reverted live component? If not, sync it.

Common candidates:
- `src/components/skeletons/hero.skeleton.tsx` — verify it still matches the reverted Hero layout.
- `src/components/skeletons/trend-chart.skeleton.tsx` — verify it matches the reverted ResponsiveContainer-wrapped chart.

- [ ] **Step 2: Apply any needed edits**

Edit only what's needed. Do not over-revert if the skeleton was already aligned.

- [ ] **Step 3: Commit (skip if no changes)**

```
git add src/components/skeletons/
git commit -m "chore(skeletons): re-sync remaining skeletons to reverted components"
```

If no changes were needed, skip the commit.

---

## Task 13: Full local verification

**Files:** (read + run only)

- [ ] **Step 1: Run lint**

Run: `pnpm lint`. Expected: clean. Fix any new lint warnings introduced by the revert.

- [ ] **Step 2: Run full unit test suite**

Run: `pnpm test`. Expected: all green. If a test you didn't touch fails because of a transitive change, investigate the root cause and fix it (do not skip the test).

- [ ] **Step 3: Production build**

Run: `pnpm build`. Expected: succeeds.

- [ ] **Step 4: Dev server walk-through (desktop)**

Run: `pnpm dev` (in another terminal if needed). Open `http://localhost:3000`.

Walk through each surface:
- **Home page** — hero (stat card simple, no badge), status bar ("LIVE" pulse, 3-col grid), composition (2-tile + epoch grid + legend strip), trend chart (ResponsiveContainer width, "Non-censored" tooltip), relay leaderboard (03 / RELAY LEADERBOARD, OFAC/NEUTRAL badges, BLOCKS column), builder leaderboard (04 / BUILDER LEADERBOARD), FAQ (paired open state), what-to-do (03 / WHAT TO DO).
- **Epoch ledger** — slot stagger animations, hover tooltip on desktop, no status badges, reconnect indicator behaves on offline.
- **`/methodology`** — terminology back to OFAC/neutral; section label "05 / OFAC RELAY CLASSIFICATION"; Data Source paragraph reads correctly (Vercel Cron + Blob); Limitation #3 references `relays.json`; Limitation #4 reads cleanly with both the Blob-snapshot and live-ledger statements.
- **`/embed`** — no freshness badge; metric card renders cleanly.
- **`/status`** — UNCHANGED (this is intentional; Justin's minimal view stays).

- [ ] **Step 5: Mobile responsiveness check**

In Chrome DevTools, switch to mobile emulation at 375 px width. Walk through the same surfaces and confirm:
- Status bar 3-col layout doesn't overflow.
- Composition section fits.
- FAQ cards stack vertically.
- Leaderboard tables either fit or scroll horizontally cleanly (no spillage).
- Epoch ledger grid doesn't blow out the viewport.

Document any actual mobile-overflow issue you find — note the file + selector — and either fix it inline (matching 37aefe1's mobile breakpoint behaviour) or add a Task 13b to track it before pushing.

Stop the dev server.

- [ ] **Step 6: Run Playwright e2e suite**

Run: `pnpm test:e2e`. Expected: green. The `e2e/mobile.spec.ts` test should now pass given Task 2's mobile-grid revert.

- [ ] **Step 7: Final commit if any inline fixes happened during verification**

If Step 5 surfaced a fix you applied:
```
git add <files>
git commit -m "fix(<surface>): <what>"
```

---

## Task 14: Push branch + open PR

**Files:** (git operations only)

- [ ] **Step 1: Pre-push diff review**

Run: `git log origin/main..HEAD --oneline` — confirm you see the expected ~13 commits in the right order. Run `git diff origin/main..HEAD --stat` — confirm no `src/lib/`, `src/app/api/`, `scripts/`, `vercel.json`, `package.json`, or `pnpm-lock.yaml` files appear in the diff.

If anything looks wrong, stop and surface to the user before pushing.

- [ ] **Step 2: Push branch**

Run: `git push -u origin front-end-refresh`.

- [ ] **Step 3: Open PR**

Run:
```
gh pr create --title "Frontend refresh to 37aefe1" --base main --body "$(cat <<'EOF'
## Summary
- Rolls the user-visible frontend back to the look and content of commit 37aefe1 (last `joshroyLabrys` commit).
- Preserves every backend / data-pipeline / module-boundary change Justin Taylor shipped on top of 37aefe1 (live-ledger module, data-freshness, Vercel Blob SQLite artifact, new cron routes, etc.).
- Restyle in place — components keep new props / data wiring; only JSX, copy, and styling are reverted.

## Out of scope
- `/status` page (left as Justin's minimal snapshot view, per design decision).
- The `relays.json` / methodology fix for the ~90% live-ledger censorship reading — deferred to a separate branch.

See `docs/superpowers/specs/2026-05-28-frontend-refresh-to-37aefe1-design.md` for the full rationale and the per-file plan.

## Test plan
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `pnpm build` succeeds
- [x] Manual desktop walk-through of home / methodology / embed / status
- [x] Mobile (375 px) walk-through — no spillage
- [x] `pnpm test:e2e` passes
- [ ] **User to review the PR diff in GitHub before merging — do not auto-merge.**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Surface the PR URL**

Print the PR URL from the `gh pr create` output to the user. Stop. Do not merge.

---

## Self-review notes (plan author)

Spec coverage check:
- ✅ Hero, status-bar, composition, trend-chart, leaderboards, faq, methodology, embed, what-to-do, epoch-ledger, globals.css, skeletons — all per-file rows have a task.
- ✅ Three Justin exceptions (Data Source, Limitation #3, FAQ Q2) explicitly preserved in Tasks 6 + 7.
- ✅ Limitation #4 merged wording included verbatim in Task 7.
- ✅ Verification covers lint, test, build, manual desktop, mobile, e2e.
- ✅ PR flow: push branch, gh pr create, do not auto-merge.

Placeholder scan: none.

Type / signature consistency: Task 3 (composition) explicitly notes the props shape `{ latest, ledger, freshness }` mismatch with 37aefe1's `{ latest }` only — addressed inline. Task 10 (epoch-ledger) explicitly maps old → new type shapes — addressed inline.
