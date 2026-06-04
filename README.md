# MEV Watch

A public transparency tool tracking OFAC censorship of Ethereum MEV-boost
blocks.

Live at **[mevwatch.info](https://mevwatch.info)**.

The site reports the daily share of MEV-boost relay payload deliveries that go
through OFAC-censoring relays. Relay posture metadata lives in
`src/data/relays.json`; the local daily SQLite artifact is generated at
`src/data/mev-watch.sqlite` and ignored by Git. Production reads the latest copy
from Vercel Blob.

## Stack

Next.js 16 App Router · React 19 · Tailwind v4 + shadcn/ui · Node SQLite data
artifact · Vercel Blob + Vercel Cron data refresh · Vitest + Playwright ·
deployed on Vercel.

## Quick Start

Requires Node 24+ and pnpm.

```bash
pnpm install
pnpm update-data --dry-run   # validate/generate the local artifact and print the missing range
pnpm dev                     # http://localhost:3000
```

## Common Commands

| Command | What it does |
|---|---|
| `pnpm dev` | start the dev server |
| `pnpm build` | production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright e2e tests; auto-starts the dev server |
| `pnpm update-data` | fetch missing complete UTC days and rewrite the local SQLite artifact |
| `pnpm update-data --dry-run` | validate the snapshot and print the missing date range without network fetches |
| `pnpm backfill-and-upload` | create a resumable backfill copy under `data/` and upload it to Vercel Blob |

## App Surfaces

- `/` — main dashboard with the freshness/status bar, hero metric,
  composition, trend, relay leaderboard, builder leaderboard, action section,
  and FAQ.
- `/methodology` — user-facing explanation of the metric, data source,
  classification, and limitations.
- `/status` — data artifact status and freshness.
- `/embed` — standalone iframe-friendly metric card.
- `/api/v1/summary`, `/api/v1/trend`, `/api/v1/relays` — public read-only JSON
  API backed by the same SQLite artifact.
- `/api/epochs` — live epoch ledger JSON backed by the live-ledger snapshot
  store, not the daily SQLite artifact.

## Architecture Pointers

- **Daily SQLite artifact** — `src/data/mev-watch.sqlite` is generated locally
  before dev/build/test commands and remains ignored by Git. Override the path
  with `MEV_WATCH_SQLITE_PATH`. Its schema is managed in
  `src/lib/mev-watch-sqlite.ts`: `metadata`, `days`, `relay_counts`, and
  `builder_counts`.
- **Production artifact** — when `BLOB_READ_WRITE_TOKEN` is present, reads are
  resolved through Vercel Blob via `src/lib/mev-watch-blob.ts`. Deployments
  should use Blob rather than relying on a bundled local SQLite file.
- **Relay metadata** — `src/data/relays.json` stores active and historical relay
  posture plus display metadata. `src/config/relays.ts` validates and exposes
  it.
- **Derivations** — `src/lib/mev-watch-data.ts`, `src/lib/metrics.ts`, and
  `src/lib/queries.ts` compute chart, composition, status, and leaderboard view
  models from raw SQLite rows.
- **Generator** — `scripts/update-data.ts` refreshes the local artifact. In
  production, `src/app/api/cron/update-data/route.ts` runs from Vercel Cron and
  uploads persisted progress to Blob.
- **Live ledger** — `src/lib/live-ledger/*` polls relay
  `/proposer_payload_delivered` endpoints and stores rolling snapshots locally
  under `data/live-ledger/` or in Blob under `MEV_WATCH_LIVE_BLOB_PREFIX`.
- **Cron routes** — `vercel.json` schedules `/api/cron/update-data` daily at
  `00:45 UTC` and `/api/cron/live-ledger-cleanup` hourly.

## Docs

- Production deploy + ops: `docs/DEPLOYMENT.md`
- Working-with-the-codebase guide for AI tools: `CLAUDE.md`
- Methodology source: `src/app/methodology/page.tsx`
- Historical design records: `docs/superpowers/specs/`
- Historical implementation plans: `docs/superpowers/plans/`

## License

UNLICENSED — public-good transparency tool by [Labrys](https://labrys.io);
contributions welcome via issue or PR.
