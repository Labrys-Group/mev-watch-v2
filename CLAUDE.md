# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MEV Watch ([mevwatch.info](https://mevwatch.info)) tracks the share of Ethereum blocks built by OFAC-compliant (censoring) vs. non-censoring MEV-boost relays since the Merge.

## Commands

This is a Turborepo monorepo using **Yarn 1 (classic)** workspaces. Run all commands from the repo root unless noted.

- `yarn install` — install all workspace dependencies
- `yarn build` — build every app/package (`turbo run build`; respects `^build` ordering)
- `yarn dev` — run all apps in dev mode in parallel
- `yarn lint` — lint every workspace (`eslint-config-labrys`)
- `yarn format` — Prettier write across `*.{ts,tsx,md}`
- Target one workspace: `yarn workspace client dev`, `yarn workspace server build`, etc.

Block-indexer data scripts (run from `apps/blockIndexer`):
- `yarn populate-relayers` — sync the relayer list into MongoDB (may print an error but still works)
- `yarn populate-block-data` — backfill `BlockStats` (slow on a fresh DB)
- `yarn populate-aggregate` — rebuild the `StatsAggregate` collection

**There is no test suite.** The `test` scripts in `apps/blockIndexer` and `packages/database` are stubs that exit 1.

**There is no development database.** Scripts and apps run against a real MongoDB via `MONGO_URI`. Test relayer/indexing changes against a local DB before touching prod.

## Architecture

### Workspaces

- `apps/client` — Next.js 12 frontend (pages router, Chakra UI + Emotion, react-query, chart.js). Package name `client`. Deploys to Vercel.
- `apps/blockIndexer` — long-running Node poller. Package name is `server` and the README calls it Express, but it is **not** an Express app — `src/index.ts` just polls relayers on a `setInterval` and runs a cron aggregation job. Was deployed to GCP/Kubernetes; that CI is now disabled (see `.github/workflows/build-block-indexer.yml`).
- `packages/database` — Mongoose + Typegoose models (`Relayer`, `BlockStats`, `StatsAggregate`) and the `connect()` helper.
- `packages/consts` — shared constants, including the canonical relayer list and FAQ content.
- `packages/utils` — Ethereum provider + slot-parsing helpers.
- `packages/ui` — small stub React component library (largely unused).
- `packages/tenderly-actions` — Tenderly Web3 Action that triggers indexing.
- `packages/tsconfig` — shared `tsconfig` bases.

### Data pipeline

External MEV-boost relay APIs → indexing helpers → MongoDB `BlockStats` (a time-series collection, hence the `ts` field) → daily aggregation → `StatsAggregate` → client charts/leaderboard. The client reads aggregated data in `getStaticProps` (ISR, 5-min revalidate) and via `/api/*` routes.

### Two indexing paths — important

Indexing/aggregation logic is **duplicated** between:
- `apps/blockIndexer/src/helpers/**` (the standalone poller), and
- `apps/client/helpers/apiHelpers/**` (Next.js API routes).

The **production path is the client API routes**: `/api/block-indexer` is hit by a Tenderly webhook on each new block, and `/api/block-indexer/aggregation` is hit by Vercel cron (`apps/client/vercel.json`, twice daily). The standalone `blockIndexer` app is the older/alternative path. When changing indexing or aggregation logic, update **both** copies or behaviour will diverge.

### Relayer list

`packages/consts/src/relayers.ts` is the source-of-truth list, but the app reads relayers from MongoDB. Adding/editing a relayer requires running `yarn populate-relayers` to sync the change into the DB. Full procedure (incl. FAQ updates and aggregate backfill) is in the root `README.md`.

## Conventions & gotchas

- **`packages/database/dist` is committed** on purpose — `.gitignore` ignores `dist` everywhere except there (`!packages/database/dist`). Both apps import from `database/dist` directly, so rebuild `database` and commit its `dist` when models change. `consts` and `database` are also transpiled by `next-transpile-modules` in `apps/client/next.config.js`.
- Environment variables use **dotenv-vault** (`.env.vault` files); there is no committed `.env`. Key vars: `MONGO_URI`, `TENDERLY_WEBHOOK_SECRET` (also used for the Vercel cron `auth` query param), and the Slack webhook URL for indexer error alerts.
- API routes use `next-connect` via the `apiHandler()` wrapper in `apps/client/helpers/api-handler.ts`, which centralises error handling (incl. Zod validation errors).
- Aggregation assumes a fixed `BLOCKS_PER_PERIOD` (12h × one block per 12s) rather than counting actual blocks — see `getBlockStatsAggregated.ts`.
- The default branch is `dev`.
