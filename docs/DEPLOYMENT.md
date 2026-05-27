# Deployment

MEV Watch deploys as a read-heavy Next.js app. Normal pages and public API
routes read a SQLite data artifact. In production, Vercel Blob hosts the latest
artifact and Vercel Cron owns scheduled maintenance.

## Required Services

- Vercel project connected to this repository.
- Vercel Blob store connected to the project. A private store is recommended.
- Vercel Cron enabled through `vercel.json`.
- Node 24 or newer for local development and Vercel builds/functions.

## Vercel Environment

Set these variables in the Vercel project:

```bash
BLOB_READ_WRITE_TOKEN=<created by Vercel Blob>
CRON_SECRET=<long random secret>
ETH_RPC_URL=<optional Ethereum JSON-RPC URL>
MEV_WATCH_BLOB_PATH=data/mev-watch.sqlite # optional daily artifact Blob pathname
MEV_WATCH_BLOB_CACHE_TTL_MS=300000 # optional read cache TTL, defaults to 5 minutes
MEV_WATCH_SQLITE_PATH=src/data/mev-watch.sqlite # optional local artifact path
MEV_WATCH_LIVE_BLOB_PREFIX=data/live-ledger/ # optional live-ledger Blob prefix
UPDATE_DATA_MAX_DAYS=30 # optional, defaults to 30 days per cron run
UPDATE_DATA_REPAIR_MAX_DAYS=30 # optional, defaults to UPDATE_DATA_MAX_DAYS
UPDATE_DATA_CONCURRENCY=4 # optional cron fetch concurrency
UPDATE_DATA_WRITE_EVERY=1 # optional, upload after each persisted batch
```

Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to cron
invocations when `CRON_SECRET` is configured.

Local-only overrides are documented in `.env.example`, including
`MEV_WATCH_LIVE_SNAPSHOT_DIR`, `MEV_WATCH_BACKFILL_SEED_PATH`, and
`MEV_WATCH_BACKFILL_PATH`.

## Cron Jobs

`vercel.json` schedules two secret-protected cron routes:

| Route | Schedule | Purpose |
|---|---:|---|
| `/api/cron/update-data` | `30 3 * * *` | refresh the daily SQLite artifact and upload persisted progress to Blob |
| `/api/cron/live-ledger-cleanup` | `0 * * * *` | prune old live-ledger snapshots from the configured snapshot store |

## Daily Data Refresh

`/api/cron/update-data` runs daily at `03:30 UTC`. The route:

1. Validates the cron `Authorization` header.
2. Acquires `data/mev-watch.sqlite.lock` in Vercel Blob, or the configured
   `MEV_WATCH_BLOB_PATH` plus `.lock`.
3. Downloads the current SQLite artifact from Vercel Blob to `/tmp`.
4. Falls back to the generated local SQLite artifact if no writable Blob
   artifact exists yet.
5. Fetches missing complete UTC days, limited by `UPDATE_DATA_MAX_DAYS`.
6. Repairs missing total-chain-block counts, limited by
   `UPDATE_DATA_REPAIR_MAX_DAYS`.
7. Writes successful days to SQLite as they complete.
8. Uploads each persisted batch back to Vercel Blob according to
   `UPDATE_DATA_WRITE_EVERY`.
9. Releases the lock in a `finally` path.

The route is date-budgeted so a large backlog advances over multiple runs
instead of risking the platform function timeout. The lock expires after 15
minutes. If another refresh already holds an unexpired lock, the route returns
`200` with `skipped: true` so Vercel does not mark the scheduled invocation as
failed.

The SQLite artifact schema is managed in `src/lib/mev-watch-sqlite.ts` and
contains `metadata`, `days`, `relay_counts`, and `builder_counts`. There are no
runtime migrations to apply during deployment.

## Live Ledger

Normal pages and public API routes never write to the daily SQLite artifact. The
one user-traffic write path is `/api/epochs`, which refreshes the live-ledger
snapshot store. Local development uses `data/live-ledger/` by default, or
`MEV_WATCH_LIVE_SNAPSHOT_DIR` when configured. Production uses Vercel Blob under
`data/live-ledger/` by default, or under `MEV_WATCH_LIVE_BLOB_PREFIX` when
configured.

`/api/cron/live-ledger-cleanup` runs hourly and removes old timestamped
live-ledger snapshots from that same store. It does not touch the daily SQLite
artifact.

## Initial Blob Seed

The repository does not commit the SQLite binary. Local dev/build/test commands
bootstrap an empty ignored artifact at `src/data/mev-watch.sqlite`, or at
`MEV_WATCH_SQLITE_PATH` when configured. After creating the Blob store, create a
real data artifact with `pnpm update-data` or `pnpm backfill-and-upload`, then
upload it to `data/mev-watch.sqlite`, or to the path configured by
`MEV_WATCH_BLOB_PATH`. The cron route can then continue from the stored
`sourceEndDate`.

To create a fresh backfilled artifact locally and upload it to Vercel Blob:

```bash
BLOB_READ_WRITE_TOKEN=<created by Vercel Blob> pnpm backfill-and-upload
```

By default this copies the local SQLite artifact to `data/mev-watch.db`,
backfills the copy, and uploads that file to the configured Blob pathname. The
Blob pathname defaults to `data/mev-watch.sqlite` so the deployed app can read it
without additional configuration.

Useful overrides:

```bash
pnpm backfill-and-upload --seed src/data/mev-watch.sqlite --file data/mev-watch.db --blob-path data/mev-watch.sqlite
```

Equivalent environment overrides are:

```bash
MEV_WATCH_BACKFILL_SEED_PATH=src/data/mev-watch.sqlite
MEV_WATCH_BACKFILL_PATH=data/mev-watch.db
MEV_WATCH_BLOB_PATH=data/mev-watch.sqlite
```

## Manual Refresh

To refresh the local seed artifact:

```bash
pnpm install
ETH_RPC_URL=<optional-rpc-url> pnpm update-data
pnpm test
pnpm build
```

To test the production cron routes locally, run the app with `CRON_SECRET` and
`BLOB_READ_WRITE_TOKEN`, then request the route with the matching
`Authorization: Bearer <secret>` header:

```bash
curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/update-data
curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/live-ledger-cleanup
```

## Rollback

Application rollback is a normal Vercel deployment rollback. Data rollback is a
Blob operation: replace `data/mev-watch.sqlite`, or the configured
`MEV_WATCH_BLOB_PATH`, with a known-good artifact. If a scheduled refresh fails
before upload, the app continues serving the previous Blob artifact.
