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

- Path alias `@/*` maps to `src/*` for application code. Modules that are transitively reachable from `tsx` scripts (anything under `src/lib/db`, and `src/lib/metrics.ts` / `src/lib/hero-verdict.ts` which `scripts/backfill-nonboost.ts` pulls in) use **relative imports** internally — `tsx` does not resolve the `@/*` alias. Files in `src/components/` and route handlers use `@/`. When in doubt, check whether anything under `scripts/` imports the module (directly or transitively) and pick relative if it does.
- Database schema lives in `src/lib/db/schema.ts`; the Drizzle client is `src/lib/db/index.ts`.
- The local database is a libSQL file under `data/`; it needs a `.env` file (copy from `.env.example`) and `pnpm db:migrate`.
- Unit tests sit beside their source as `*.test.ts(x)`; e2e tests live in `e2e/`.

## Data pipeline

Two paths feed the UI, both rooted in MEV-boost relay data:

- **Daily snapshot pipeline (server-side, cron)** — relayscan.io's public JSON API (`GET /stats/day/{date}/json`), behind the `DataSource` adapter in `src/lib/data-source/`, supplies one row per day. The OFAC-censorship classification of each relay is an editorial config in `src/config/relays.ts`. `src/lib/metrics.ts` computes the censorship metric as the censoring relays' **share of MEV-boost relay payload deliveries** (relayscan counts payloads per relay, so a ratio cancels the multi-relay double-counting). `src/lib/refresh/` orchestrates fetch → compute → persist → audit-log. A Vercel Cron job calls the secret-protected `/api/refresh` route daily; failures alert via Slack. The trend chart, leaderboards, and `/api/v1/*` endpoints read only the snapshot tables, never the external API.
- **Live epoch ledger (per-request, no DB)** — `src/lib/epochs/ingest.ts` and `src/lib/epochs/relay-payloads.ts` poll each relay's `/proposer_payload_delivered` endpoint directly on every request to the live ledger panel and `/api/epochs`. This is intentionally bypass-the-snapshot so the visible window is real-time.

A public read-only JSON API is served under `/api/v1/` (summary, trend, relays); `/status` surfaces refresh health. The per-slot honest-metric work (Phases A–E, see specs) adds a third, parallel pipeline that writes to the same `daily_stats` row.

## Status

The original v2 overhaul (Phases 1–5: foundation, data layer, core UI, deployment, iteration) is complete and live at mevwatch.info. A separate per-slot honest-censorship metric initiative is in flight — see `docs/superpowers/specs/2026-05-24-per-slot-honest-metric-design.md` for the Phases A–E roadmap; Phase A (bloXroute fix + observability) has landed. Production provisioning: see `docs/DEPLOYMENT.md`.
