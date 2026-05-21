# MEV Watch v2 — Re-style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Re-style the MEV Watch dashboard so it feels contained and structured instead of scattered. Replace the permanent full-page grid + transparent sections with **solid section panels** on a solid page, and use the **faded grid as a contained accent** (the hero only). Follows the Labrys Website V2 styling philosophy.

**Scope:** A visual refactor — no behaviour, data, or copy changes. Touches `globals.css`, a new shared `Section` component, all section components, the homepage, and the secondary pages.

**Conventions:** Repo root `C:\Users\Joshr\Desktop\Projects\Labrys-Group\mev-watch`, branch `MEVWatch-2`, PowerShell. App code uses `@/*`. After each task run `pnpm build` and commit.

---

## The design pattern (apply consistently everywhere)

**Layering / color hierarchy** — three solid levels, no transparency for structure:
- **Page** → `bg-background` (the base). No grid.
- **Section panel** → `bg-panel` + `border border-border-labrys`, small radius `rounded-[var(--radius)]`. Each homepage section is one such panel.
- **Wells/sub-cards inside a section** (legend cells, stat boxes, the chart frame, table containers) → `bg-background` — a recessed step *down* from the `bg-panel` section, so they read as inset. Keep their `border border-border-labrys`.
- **Tinted callouts** (the mint insight row, etc.) keep their tint (`bg-good/10` etc.) — unchanged.

**The faded grid** — contained, not page-wide. A `.faded-grid` utility (theme-aware grid lines, radial-masked so it fades out). Used **only on the Hero**.

**Sections** — every numbered homepage section uses the shared `<Section>` wrapper (Task 2): a solid `bg-panel` card with a bordered header strip (label + title + optional aside) and a padded body. Sections are stacked with a consistent `gap`/`space-y-6`. No more `border-b` dividers, no bare transparent `<section>`s.

**Keep the terminal identity** — mono type, sharp/minimal radius, numbered section labels, the existing color tokens. This is a containment/background re-style, not a redesign.

---

## Task 1: Faded-grid utility in globals.css

**Files:** Modify `src/app/globals.css`

- [ ] **Step 1:** In `src/app/globals.css`, replace the existing `.terminal-grid` rule with a `.faded-grid` utility — theme-aware grid lines that fade out via a radial mask:

```css
/* Contained, faded grid texture — used as a hero accent, never page-wide. */
.faded-grid {
  background-image:
    linear-gradient(var(--border-labrys) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-labrys) 1px, transparent 1px);
  background-size: 30px 30px;
  -webkit-mask-image: radial-gradient(
    ellipse 75% 70% at 50% 28%,
    #000 0%,
    transparent 78%
  );
  mask-image: radial-gradient(
    ellipse 75% 70% at 50% 28%,
    #000 0%,
    transparent 78%
  );
}
```

- [ ] **Step 2:** `pnpm build` → succeeds (note: `.terminal-grid` references elsewhere will be fixed in later tasks; the build may still pass since unknown classes are inert — if the build fails, leave a temporary empty `.terminal-grid {}` rule and note it).
- [ ] **Step 3: Commit:** `git add -A && git commit -m "style: replace page-wide grid with a contained faded-grid utility"`

---

## Task 2: Shared Section panel component

**Files:** Create `src/components/section.tsx`

- [ ] **Step 1: Create `src/components/section.tsx`:**

```tsx
import type { ReactNode } from "react";

interface SectionProps {
  /** Mono label, e.g. "01 / POST-MERGE COMPOSITION". */
  label: string;
  /** Section heading. */
  title: ReactNode;
  /** Optional right-aligned meta shown in the header strip. */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * A solid, contained section panel: a bordered `bg-panel` card with a header
 * strip (label + title + optional aside) above a padded body. Homepage
 * sections stack these with a consistent gap.
 */
export function Section({ label, title, aside, children }: SectionProps) {
  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel">
      <header className="flex items-end justify-between gap-4 border-b border-border-labrys px-5 py-4 md:px-6 md:py-5">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-muted">
            {label}
          </div>
          <h2 className="mt-2 font-sans text-2xl font-bold leading-tight tracking-tight text-foreground md:text-[28px]">
            {title}
          </h2>
        </div>
        {aside ? (
          <div className="hidden text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-fg-muted sm:block">
            {aside}
          </div>
        ) : null}
      </header>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2:** `pnpm build` → succeeds.
- [ ] **Step 3: Commit:** `git add -A && git commit -m "feat: add shared Section panel component"`

---

## Task 3: Restyle the Hero

**Files:** Modify `src/components/sections/hero.tsx`

- [ ] **Step 1:** Restyle `Hero` so it is a self-contained solid panel with the faded grid as its texture. Keep all existing content (the `// PUBLIC TRANSPARENCY TOOL` tag, the "CENSORSHIP / IS / FALLING" headline, the stat line, the terminal lede box) and the existing props. Changes only:
  - The outer element becomes a solid panel: `relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel`, with generous padding (`p-6 md:p-10`).
  - Add the faded grid as an absolutely-positioned layer behind the content: a `<div aria-hidden className="faded-grid pointer-events-none absolute inset-0" />`, with the content in a `relative` wrapper above it.
  - Keep the two-column layout, headline, stat, and lede. Do not change copy or the data wiring.
- [ ] **Step 2:** `pnpm build` → succeeds.
- [ ] **Step 3: Commit:** `git add -A && git commit -m "style: restyle hero as a solid panel with a contained faded grid"`

---

## Task 4: Restyle the chrome (StatusBar, SiteHeader, SiteFooter)

**Files:** Modify `src/components/sections/status-bar.tsx`, `src/components/sections/site-header.tsx`, `src/components/sections/site-footer.tsx`

- [ ] **Step 1:** `StatusBar` — give it a solid background `bg-panel-alt` (so it reads as a distinct telemetry strip) with a bottom border. Keep all cells/content.
- [ ] **Step 2:** `SiteHeader` — ensure it sits on a solid background (no reliance on a page grid); keep `bg-background` or transparent-over-solid-page. Keep all content/nav.
- [ ] **Step 3:** `SiteFooter` — solid `bg-panel-alt` (or `bg-panel`) with a top border, so the footer is a clearly contained band. Keep all content.
- [ ] **Step 4:** `pnpm build` → succeeds.
- [ ] **Step 5: Commit:** `git add -A && git commit -m "style: give the status bar, header, and footer solid backgrounds"`

---

## Task 5: Restyle Composition + CompositionGrid

**Files:** Modify `src/components/sections/composition.tsx`, `src/components/sections/composition-grid.tsx`

- [ ] **Step 1:** `Composition` — replace its hand-rolled `<section>`/header with the shared `<Section>` (`label="01 / POST-MERGE COMPOSITION"`, `title={<>Censoring vs. neutral relays.</>}`, `aside` = the existing "DISTRIBUTION OF MEV-BOOST BLOCKS / N = …" meta). The body content (stacked bar, axis, legend, insight row) moves inside `<Section>`. Inside the section: the stacked bar keeps its borders; the **legend cells become recessed wells** — change them from `bg-background` to keep `bg-background` (they are already recessed against the new `bg-panel` section — good; just confirm they have `border border-border-labrys`). Remove the now-redundant inner `bg-panel p-6` panel wrapper — the `<Section>` body already provides the panel. The insight row keeps its `bg-good/10` tint.
- [ ] **Step 2:** `CompositionGrid` — replace its `<section>`/header with `<Section>` (`label="06 / BLOCK COMPOSITION"`, appropriate `title`). The tile grid and stats header move into the body; the tile grid frame becomes a recessed `bg-background` well with a border. Keep the logo watermark and footnote.
- [ ] **Step 3:** `pnpm build` → succeeds.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "style: restyle composition sections as solid panels"`

---

## Task 6: Restyle Leaderboard + BuilderLeaderboard

**Files:** Modify `src/components/sections/leaderboard.tsx`, `src/components/sections/builder-leaderboard.tsx`

- [ ] **Step 1:** `Leaderboard` — wrap in `<Section>` (`label="02 / RELAY LEADERBOARD"`, existing title, optional aside). The table moves into the section body. Keep the table styling, posture badges, mini-bars. Ensure the table sits cleanly in the padded body (a recessed `bg-background` table frame is optional but nice).
- [ ] **Step 2:** `BuilderLeaderboard` — wrap in `<Section>` (`label="03 / BUILDER LEADERBOARD"`, existing title). Same treatment.
- [ ] **Step 3:** `pnpm build` → succeeds.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "style: restyle leaderboards as solid panels"`

---

## Task 7: Restyle WhatToDo + TrendChart + Faq

**Files:** Modify `src/components/sections/what-to-do.tsx`, `src/components/sections/trend-chart.tsx`, `src/components/sections/faq.tsx`

- [ ] **Step 1:** `WhatToDo` — wrap in `<Section>` (`label="04 / WHAT TO DO"`, existing title). The callout panel + steps + share strip move into the body. The callout's two columns become recessed `bg-background` wells (or keep the existing treatment but ensure solid, not transparent).
- [ ] **Step 2:** `TrendChart` — wrap in `<Section>` (`label="05 / CENSORSHIP OVER TIME"`, existing title, the stat header `NOW/PEAK/TROUGH` can be the `aside` OR stay as a row inside the body). Keep the `"use client"` directive, the Recharts chart, and the range toggle. The chart frame becomes a recessed `bg-background` well. Do NOT change chart logic.
- [ ] **Step 3:** `Faq` — wrap in `<Section>` (`label="07 / FAQ"`, existing title). The two-column `<details>` accordion grid moves into the body; each accordion item sits on the section panel cleanly.
- [ ] **Step 4:** Section numbering — the homepage order (in `src/app/page.tsx`) is Hero, then 01 Composition, 02 Relay leaderboard, 03 Builder leaderboard, 04 What to do, 05 Censorship over time (TrendChart), 06 Block composition (CompositionGrid), 07 FAQ. Use exactly those numbers in the `label` props across Tasks 5-7 so the sequence matches the on-page order.
- [ ] **Step 5:** `pnpm build` → succeeds.
- [ ] **Step 6: Commit:** `git add -A && git commit -m "style: restyle remaining homepage sections as solid panels"`

---

## Task 8: Restyle the pages (homepage + secondary)

**Files:** Modify `src/app/page.tsx`, `src/app/methodology/page.tsx`, `src/app/explorer/page.tsx`, `src/app/status/page.tsx`, `src/app/api-docs/page.tsx`, `src/app/embed/page.tsx`

- [ ] **Step 1:** `src/app/page.tsx` — the root wrapper becomes `<div className="min-h-screen bg-background">` (remove `terminal-grid`). Inside the `max-w-[1280px]` container, wrap the stacked sections in a `<div className="space-y-6 py-6">` so the section panels have consistent gaps. Keep the StatusBar above the container and the SiteFooter below, as now. Also update the no-data fallback `<main>` (currently `terminal-grid`) to `bg-background`.
- [ ] **Step 2:** `methodology`, `explorer`, `status`, `api-docs` pages — each currently wraps content in `<div className="terminal-grid min-h-screen">`. Change to `<div className="min-h-screen bg-background">`. Where these pages have prose/content blocks, ensure those blocks sit on solid `bg-panel` cards (most already do — just confirm no transparent-over-grid reliance). Keep all content.
- [ ] **Step 3:** `embed` page — if it uses `terminal-grid`, switch to a solid `bg-background`; the embed card itself stays a solid `bg-panel` card. It may keep a small `faded-grid` accent if it already had grid styling — but solid card on solid bg is the requirement.
- [ ] **Step 4:** Grep the whole `src/` for any remaining `terminal-grid` usages — there should be none left. If any remain, fix them to the new approach.
- [ ] **Step 5:** `pnpm build` → succeeds.
- [ ] **Step 6: Commit:** `git add -A && git commit -m "style: solid page backgrounds; consistent section spacing"`

---

## Task 9: Verify

- [ ] **Step 1:** Run `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e` — all must pass.
- [ ] **Step 2:** Confirm `grep -r "terminal-grid" src/` returns nothing (the page-wide grid is fully removed).
- [ ] **Step 3: Commit** any final fixes: `git add -A && git commit -m "style: re-style verification"`

---

## Done — re-style complete

The dashboard is a clean stack of solid, contained section panels on a solid background, with the faded grid as a contained hero accent — no more page-wide grid bleed.
