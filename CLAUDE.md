# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project

MEV Watch v2 ([mevwatch.info](https://mevwatch.info)) is a public transparency
tool tracking OFAC censorship of Ethereum MEV-boost blocks. This repository is
a single Next.js application; the v1 Turborepo monorepo was fully replaced.

The active implementation uses a SQLite data artifact, not a remote application
database.

## Commands

Package manager is **pnpm**. Run commands from the repo root.

- `pnpm dev` — start the dev server at http://localhost:3000
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm test` — Vitest unit tests
- `pnpm test:watch` — Vitest in watch mode
- `pnpm test -- src/lib/format.test.ts` — run a single test file
- `pnpm test:e2e` — Playwright e2e tests; auto-starts the dev server
- `pnpm update-data` — fetch missing complete UTC days and update `src/data/mev-watch.sqlite`
- `pnpm update-data --dry-run` — validate the local artifact and print the missing date range
- `pnpm backfill-and-upload` — create/update a resumable backfill copy under `data/` and upload it to Vercel Blob

## Architecture

Next.js 16 App Router app. Styling is Tailwind CSS v4 + shadcn/ui, with Labrys
design tokens in `src/app/globals.css`, light/dark theme support through
`next-themes`, and focused UI primitives under `src/components/`.

The app reads a SQLite artifact through Node's `node:sqlite` APIs. The local
artifact at `src/data/mev-watch.sqlite` is gitignored and serves as the dev
seed and fallback; populate it with `pnpm update-data`. In production,
`BLOB_READ_WRITE_TOKEN` enables Vercel Blob-backed reads and writes through
`src/lib/mev-watch-blob.ts`.

### Key Conventions

- Path alias `@/*` maps to `src/*` for application code. Modules that are
  imported by `tsx` scripts use relative imports internally because the scripts
  do not resolve the `@/*` alias.
- The active SQLite schema is defined in `src/lib/mev-watch-sqlite.ts`, with
  `metadata`, `days`, `relay_counts`, and `builder_counts` tables.
- Relay posture and display metadata live in `src/data/relays.json`; validated
  accessors live in `src/config/relays.ts`.
- Unit tests sit beside their source as `*.test.ts(x)`; e2e tests live in
  `e2e/`.

## Data Pipeline

Two paths feed the UI:

- **Daily snapshot pipeline** — `scripts/update-data.ts` and
  `src/app/api/cron/update-data/route.ts` fetch missing complete UTC days from
  relayscan.io, count total execution-layer blocks with Ethereum RPCs, persist
  rows to SQLite, and upload persisted progress to Vercel Blob in production.
  `src/lib/metrics.ts` computes censorship as censoring relays' share of
  MEV-boost relay payload deliveries. `src/lib/queries.ts` derives dashboard,
  status, and API data from the artifact.
- **Live epoch ledger** — `src/lib/live-ledger/*` polls each active relay's
  `/proposer_payload_delivered` endpoint and stores rolling snapshots in a
  `SnapshotStore`. Local development defaults to `data/live-ledger/`; production
  uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. `/api/epochs` refreshes
  this live snapshot store and never updates the daily SQLite artifact.

## Routes And Jobs

- `/` — dashboard
- `/methodology` — user-facing methodology
- `/status` — artifact status and freshness
- `/embed` — standalone embeddable metric card
- `/api/v1/summary`, `/api/v1/trend`, `/api/v1/relays` — public read-only JSON API
- `/api/epochs` — live epoch ledger JSON
- `/api/cron/update-data` — secret-protected daily artifact refresh
- `/api/cron/live-ledger-cleanup` — secret-protected cleanup for old live-ledger snapshots

`vercel.json` schedules `/api/cron/update-data` every 12 hours at `00:45 UTC`
and `12:45 UTC`; `/api/cron/live-ledger-cleanup` runs hourly.

## Environment

Start from `.env.example`. The main production variables are
`BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, optional `ETH_RPC_URL`, optional Blob
path overrides, and update tuning variables such as `UPDATE_DATA_MAX_DAYS`,
`UPDATE_DATA_CONCURRENCY`, `UPDATE_DATA_REPAIR_MAX_DAYS`, and
`UPDATE_DATA_WRITE_EVERY`. Analytics: `NEXT_PUBLIC_GTM_ID` loads the Google
Tag Manager container (GA4 and any other tags are configured inside GTM, not
in code). Vercel Analytics and Speed Insights are wired via
`@vercel/analytics` and `@vercel/speed-insights` in `src/app/layout.tsx` and
need no env vars.

## Status

The current production shape is documented in `README.md` and
`docs/DEPLOYMENT.md`. Prefer those active docs and the current code over older
planning docs when resolving implementation questions.
