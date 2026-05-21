# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MEV Watch v2 ([mevwatch.info](https://mevwatch.info)) — a public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks. A single Next.js application; the v1 Turborepo monorepo was fully replaced. See `docs/superpowers/specs/2026-05-21-mev-watch-v2-overhaul-design.md` for the design and `docs/superpowers/plans/` for phased implementation plans.

## Commands

Package manager is **pnpm**. Run from the repo root.

- `pnpm dev` — start the dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm test` — Vitest unit tests
- `pnpm test:watch` — Vitest in watch mode
- `pnpm test -- src/lib/format.test.ts` — run a single test file
- `pnpm test:e2e` — Playwright e2e tests (auto-starts the dev server)
- `pnpm db:generate` — generate a Drizzle migration from `src/lib/db/schema.ts`
- `pnpm db:migrate` — apply migrations
- `pnpm db:check` — verify the database connection
- `pnpm refresh [date]` — fetch + store one day of relay stats (default: yesterday)
- `pnpm seed-history [start] [end]` — backfill historical daily snapshots
- `pnpm db:summary` — print snapshot row count and the latest day

## Architecture

Next.js 16 App Router app. Styling is Tailwind CSS v4 + shadcn/ui (radix-nova), themed with the Labrys design tokens in `src/app/globals.css` (light/dark via `next-themes`, accent is mint in light mode and blurple in dark). Data is stored in libSQL (a local file in development, hosted Turso in production) and accessed via Drizzle ORM.

### Key conventions

- Path alias `@/*` maps to `src/*` for application code. Modules under `src/lib/db` use **relative imports** internally so `tsx` scripts (e.g. `scripts/`) resolve them without a path-alias resolver.
- Database schema lives in `src/lib/db/schema.ts`; the Drizzle client is `src/lib/db/index.ts`.
- The local database is a libSQL file under `data/`; it needs a `.env` file (copy from `.env.example`) and `pnpm db:migrate`.
- Unit tests sit beside their source as `*.test.ts(x)`; e2e tests live in `e2e/`.

## Data pipeline

Censorship data comes from the **relayscan.io** public JSON API (`GET /stats/day/{date}/json`), behind the `DataSource` adapter in `src/lib/data-source/`. The OFAC-censorship classification of each relay is an editorial config in `src/config/relays.ts`. `src/lib/metrics.ts` computes the censorship metric as the censoring relays' **share of MEV-boost relay payload deliveries** (relayscan counts payloads per relay, so a ratio cancels the multi-relay double-counting). `src/lib/refresh/` orchestrates fetch → compute → persist → audit-log. Pages read only the snapshot tables, never the external API.

## Status

Phases 1-3 complete (foundation, data layer, core UI). Phases 4-5 (deploy, iteration) tracked in docs/superpowers/plans/.
