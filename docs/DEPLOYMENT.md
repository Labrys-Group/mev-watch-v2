# Deployment

MEV Watch deploys as a read-only Next.js app for normal user traffic. Pages and
API routes read a SQLite data artifact. In production, Vercel Blob hosts the
latest artifact and Vercel Cron is the only writer.

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
MEV_WATCH_BLOB_PATH=data/mev-watch.sqlite # optional override
MEV_WATCH_LIVE_BLOB_PREFIX=data/live-ledger/ # optional live-ledger Blob prefix
UPDATE_DATA_MAX_DAYS=30 # optional, defaults to 30 days per cron run
UPDATE_DATA_WRITE_EVERY=1 # optional, upload after each persisted batch
```

Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to cron
invocations when `CRON_SECRET` is configured.

## Data Refresh

`vercel.json` invokes `/api/cron/update-data` daily at 03:30 UTC. The route:

1. Validates the cron `Authorization` header.
2. Acquires `data/mev-watch.sqlite.lock` in Vercel Blob.
3. Downloads the current SQLite artifact from Vercel Blob to `/tmp`.
4. Fetches missing complete UTC days.
5. Writes successful days to SQLite as they complete.
6. Uploads each persisted batch back to Vercel Blob.
7. Releases the lock in a `finally` path.

Normal pages and public API routes never write to SQLite. The narrow exception
for user traffic is `/api/epochs`, which writes immutable timestamped JSON
snapshots under the live-ledger prefix only; it never updates the daily SQLite
artifact or a mutable `latest.json` pointer.

Each cron invocation is date-budgeted so a large backlog advances over multiple
runs instead of risking the platform function timeout. By default the route
fetches up to 30 missing days and uploads every persisted day.

The lock expires after 15 minutes. If another refresh already holds an
unexpired lock, the cron route returns `200` with `skipped: true` so Vercel does
not mark the scheduled invocation as failed.

## Initial Blob Seed

The repository includes `src/data/mev-watch.sqlite` as a local seed artifact.
After creating the Blob store, upload that file to `data/mev-watch.sqlite`.
The cron route can then continue from the stored `sourceEndDate`.

## Manual Refresh

To refresh the local seed artifact:

```bash
pnpm install
ETH_RPC_URL=<optional-rpc-url> pnpm update-data
pnpm test
pnpm build
```

To test the production cron route locally, run the app with `CRON_SECRET` and
`BLOB_READ_WRITE_TOKEN`, then request `/api/cron/update-data` with the matching
`Authorization: Bearer <secret>` header.

## Rollback

Application rollback is a normal Vercel deployment rollback. Data rollback is a
Blob operation: replace `data/mev-watch.sqlite` with a known-good artifact. If a
scheduled refresh fails before upload, the app continues serving the previous
Blob artifact.
