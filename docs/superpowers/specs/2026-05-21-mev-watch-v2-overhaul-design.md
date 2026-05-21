# MEV Watch v2 — Complete Overhaul (Design Spec)

**Date:** 2026-05-21
**Branch:** `MEVWatch-2`
**Status:** Approved — ready for implementation planning

---

## 1. Summary

A from-scratch rebuild of [mevwatch.info](https://mevwatch.info) — MEV Watch v2. The current
app (a Next.js 12 monorepo with a self-hosted block indexer) is replaced by a single modern
Next.js application that sources censorship data from an external feed, stores its own
historical snapshots, and presents them through a terminal/data-monitor interface built on
the new Labrys design system.

The product keeps its purpose — tracking OFAC censorship of Ethereum MEV-boost blocks — but
updates the narrative for 2026: censorship has fallen sharply from its 2022 peak, so v2 is an
optimistic-but-vigilant **scoreboard**, not an alarm.

## 2. Goals & non-goals

**Goals**
- Eliminate the structural problems of v1: duplicated indexer code, a dead Kubernetes
  deployment, no development database, committed build artifacts, stale relayer data.
- Modern, maintainable stack consistent with `labrys-website-v2`.
- A distinctive, high-quality interface — its own brand identity on Labrys design foundations.
- Buildable and fully runnable **locally** with no cloud accounts (Phase 1).
- Iterative delivery: ship the core scoreboard, then expand.

**Non-goals**
- No standalone long-running indexer service or Kubernetes.
- No Turborepo monorepo — a single application.
- v1's exact 2022 framing and visual design are not preserved.

## 3. Narrative & positioning

**Core story: "resistance is winning."** Censorship resistance has largely succeeded —
non-censoring relays now build the majority of blocks. v2 presents the live status,
celebrates the trend, and watches for regression.

- The hero leads with the **decline** ("CENSORSHIP IS FALLING", the current % with a ▼ arrow
  and a comparison to the ~78% 2022 peak).
- Editorial accents are encouraging (mint-toned), not alarmist. Red is reserved for genuine
  regression signals, not the baseline state.
- MEV Watch v2 is **its own brand**, built on Labrys's new branding guidelines, with a
  subtle "by Labrys" credit.

## 4. Architecture

### 4.1 Repository

The current Turborepo monorepo (2 apps + 6 packages) collapses into **one Next.js
application at the repository root**, on the `MEVWatch-2` branch. Git history is preserved;
v1 code remains referenceable through history.

### 4.2 Stack

Matches `labrys-website-v2` for ecosystem consistency:

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui, Labrys design tokens |
| Database | PostgreSQL via Drizzle ORM |
| Charts | Recharts (trend chart, bars) — confirm React 19 compatibility at build time |
| Tooling | pnpm · Vitest + Testing Library · Playwright · ESLint |
| Local infra | Docker Compose (Postgres) |
| Hosting (Phase 4) | Vercel + Neon (serverless Postgres) + Vercel Cron |

## 5. Data layer

### 5.1 External source adapter

Censorship/relay data is pulled from an **external provider** rather than self-indexed. The
provider sits behind a single adapter interface (`DataSource`) so it is mockable in tests
and swappable without touching the rest of the app.

- **Primary candidate:** relayscan.io (public API, maintained by Flashbots research).
- **Fallback candidate:** Dune Analytics MEV-boost datasets.
- The exact provider and field mapping are **verified during implementation** (see §12).

### 5.2 OFAC classification config

The editorial judgement — which relays are "OFAC-compliant / censoring" vs "neutral" — is
the one thing kept under our control. It lives in a **static config file in the repo**
(`src/config/relays.ts`): relay name, URL, `isOfacCensoring`, display priority, `disabled`.
This replaces v1's `packages/consts/src/relayers.ts` and removes the "populate the DB"
ritual entirely — the config *is* the source of truth, joined to measured stats at refresh
time.

### 5.3 Database schema (Postgres / Drizzle)

Postgres stores **our own snapshots** so history and uptime do not depend on the upstream
provider. Initial tables:

- `daily_stats` — one row per day: `date` (PK), `censorship_pct`, `neutral_pct`,
  `non_boost_pct`, `total_blocks`, `created_at`. Drives the trend chart.
- `relay_daily_stats` — per relay per day: `relay_key`, `date`, `blocks`, `share_pct`,
  `censorship_rate`. Drives the leaderboard (latest row) and per-relay sparklines (history).
- `recent_blocks` — a rolling window (~320 rows) of the most recent blocks: `slot`,
  `block_number`, `relay_key`, `category` (`ofac` | `neutral` | `non_boost`), `ts`. Drives
  the live block grid.
- `refresh_log` — `id`, `ran_at`, `status`, `source`, `message`. Powers the "last updated"
  timestamp, alerting, and (later) the status page.

Builder tables (`builder_daily_stats`) are added in the builder iteration (§7.5).

### 5.4 Refresh job

A single refresh routine: fetch from the external source → compute metrics → merge the OFAC
classification → upsert `daily_stats`, `relay_daily_stats`, `recent_blocks` → write
`refresh_log`.

- **Locally (Phase 1):** exposed as `pnpm refresh`, run on demand.
- **Production (Phase 4):** the same routine triggered hourly by Vercel Cron via a
  secret-protected API route. The trigger is swappable because the refresh *logic* is a
  plain module.
- No long-running process exists at any phase.

### 5.5 Metric methodology

Two distinct measures, both shown:
- **Posture** — a binary, editorial classification (OFAC-compliant / neutral) from our
  config. Drives the composition breakdown and the leaderboard "posture" tag.
- **Censorship rate** — a measured percentage per relay, from the external source. Drives
  the leaderboard ranking.

Composition categories: `OFAC-compliant relay` / `neutral relay` / `non-MEV-boost`. The
exact formula for the headline "censorship %" is finalised against the chosen data source's
fields and documented on the `/methodology` page.

### 5.6 Resilience & error handling

- Pages read **only from Postgres**, never the external API at request time — the site is
  fast and stays up if the provider is down.
- If a refresh fails, the last good snapshot is retained, the failure is recorded in
  `refresh_log`, and an alert is sent (Slack webhook, carried over from v1).
- Every page shows a visible "last updated" timestamp sourced from `refresh_log`.

## 6. Data flow

```
External MEV source (relayscan.io API; Dune fallback)
        │   Phase 1: pnpm refresh   ·   Phase 4: hourly Vercel Cron → /api/refresh (secret)
        ▼
  Compute metrics ── merge ── OFAC classification (static config in repo)
        │
        ▼
  Postgres snapshot store (Drizzle): daily_stats · relay_daily_stats · recent_blocks · refresh_log
        │
        ▼  pages read ONLY from Postgres
  Next.js App Router pages (ISR / server components, revalidated on refresh)
```

## 7. Pages & content

### 7.1 Homepage — the scoreboard

A single scrolling page, structured per the approved `mockup-b-terminal.html`:

- **Live status bar** — network telemetry (network, status, slot/block/epoch, censorship %,
  last updated).
- **Header** — MEV Watch brand mark + nav (Overview, Relays, Methodology, API).
- **Hero** — `// PUBLIC TRANSPARENCY TOOL` tag, "CENSORSHIP IS FALLING" headline, the live
  figure with a ▼ trend and peak comparison, an ASCII composition bar, a terminal-style
  lede.
- **Controls** — "Include all blocks / Post-merge only" segmented toggle; window & sample
  readout.
- **01 / Post-Merge Composition** — a 3-way stacked bar (OFAC / Neutral / Non-MEV-boost),
  three legend cells with 30-day deltas, and a mint-toned insight row.
- **02 / Relay Leaderboard** — relays ranked by censorship rate; posture tag, mini-bar,
  blocks/30d, share, link to detail.
- **03 / What To Do** — callout with numbered validator steps + a share strip
  (X / Copy / Embed / Cite).
- **04 / Censorship Over Time** — annotated trend chart since the Merge with
  Now/30d-avg/Peak/Trough stat header and a range toggle.
- **05 / Recent Blocks** — the live block grid (~320 tiles, ~12s each, hover for detail).
- **06 / FAQ** — two-column accordion.
- **Footer** — brand, Data / Resources / Connect columns, "made with" Labrys lockup.

### 7.2 `/methodology`

How the metrics are computed, what "censoring" means, the data source, the OFAC
classification rationale, refresh cadence, and honest limitations. The credibility anchor.

### 7.3 `/explorer`

Fuller, sortable relay tables with per-relay detail (URL, posture, censorship-rate history
sparkline). The builder explorer is added in the builder iteration.

### 7.4 `/embed`

A compact, iframe-able card of the headline metric so third parties can embed live MEV
Watch data. Rendered standalone (no header/footer/status bar).

### 7.5 Later iterations (in scope, built iteratively)

- **Builder data** — a builder leaderboard/snapshot on the homepage and a builder view in
  `/explorer`, backed by `builder_daily_stats`.
- **Public API** — a documented, read-only JSON API over the snapshot store.
- **Status page** — refresh health and data freshness, backed by `refresh_log`.

## 8. Design system

### 8.1 Aesthetic

A **terminal / data-monitor** interface, taken from `mockup-b-terminal.html`: monospace
data type, an isometric grid background, sharp 1px rules, ASCII bar charts, numbered
sections (`01 /`, `02 /`), a live telemetry status bar.

### 8.2 Theming

Light **and** dark mode via `next-themes`, following `labrys-website-v2` tokens:

- **Accent:** mint `#00EF9F` in light mode, blurple `#4F0CE5` in dark mode (theme-aware,
  per the Labrys token convention).
- **Semantic colors are theme-aware.** Dark mode uses saturated values (OFAC `#FF6B6B`,
  neutral `#00EF9F`). Light mode uses **pastel** values on white (OFAC ~`#F0A9A0`, neutral
  ~`#7DE9C4`) with darkened text variants for contrast.
- Base tokens (background, panel, panel-alt, foreground, rules) are imported directly from
  the `labrys-website-v2` token set.

### 8.3 Typography

- **Spline Sans Mono** — data, labels, UI chrome (the terminal voice).
- **Manrope** — display headlines and large figures.
- Both already defined as font tokens in `labrys-website-v2`.

### 8.4 Components

shadcn/ui primitives from `labrys-website-v2` (button, card, table, etc.) are reused and
**adapted to the terminal aesthetic** — e.g. the `--radius` token tuned down toward sharp
edges, mono font applied to data surfaces. We adapt the design system rather than
hand-rolling components. Labrys logo assets (gradient / blurple / white lockup variants)
are carried over.

## 9. Testing & quality

- **Vitest + Testing Library** — unit tests, focused on pure logic: metric computation
  (censorship %, neutral %, deltas), the OFAC classification merge, and snapshot/aggregation
  transforms. This logic is built test-first.
- **Playwright** — e2e smoke tests: homepage renders with data, theme toggle works, key
  sections present, `/embed` renders standalone.
- The `DataSource` adapter is mocked in all tests; no test hits the network.
- ESLint + TypeScript strict, matching `labrys-website-v2`.

## 10. Build phasing

Iterative delivery — ship the core, then expand.

1. **Foundation** — scaffold the Next.js app, Docker Compose Postgres, Drizzle schema, port
   design tokens + theming from `labrys-website-v2`.
2. **Data layer** — `DataSource` adapter, refresh routine, metric computation, history
   seed. Fully runnable locally via `pnpm refresh`.
3. **Core UI** — homepage scoreboard sections, `/methodology`, `/explorer`, `/embed`.
4. **Deploy** — Vercel + Neon + Vercel Cron; Slack alerting.
5. **Iteration** — builder data, then the public API, then the status page (§7.5).

Phases 1–3 deliver a complete, locally-runnable product before any cloud setup.

## 11. Migration from v1

- The new app is built at the repo root; the old `apps/`, `packages/`, `turbo.json`,
  `yarn.lock`, `.env.vault`, and related monorepo files are removed.
- `CLAUDE.md` is rewritten for the new architecture once the app exists.
- v1's MongoDB historical data is **not** migrated by default — `daily_stats` history is
  seeded from the external source. A one-time import of the old `StatsAggregate` data is an
  optional follow-up if exact continuity with v1's chart is desired.

## 12. Open questions / to verify during implementation

- **Data source:** confirm relayscan.io's current public API, fields, rate limits, and
  history depth; confirm the Dune fallback. Finalise the exact censorship-% formula.
- **Charts:** confirm Recharts ↔ React 19 compatibility; otherwise choose an alternative.
- **Block grid data:** confirm whether recent-block detail is available from the chosen
  source at the granularity the grid needs.
- **History seed:** confirm how far back the external source's history reaches for the
  trend chart.
