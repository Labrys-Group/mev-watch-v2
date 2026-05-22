# Deploying MEV Watch v2

MEV Watch runs as a single Next.js app on **Vercel**, backed by a hosted
**Turso** (libSQL) database, with a daily Vercel Cron job refreshing the data.

Everything in the codebase is deployment-ready. The steps below are the
human-operated checklist to take it live — they need Turso and Vercel accounts.

---

## 1. Create the Turso database

Install the Turso CLI and sign in:

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash
# Windows: see https://docs.turso.tech/cli/installation

turso auth login
```

Create the database and read its credentials:

```bash
turso db create mev-watch

# The libsql:// connection URL — copy it:
turso db show mev-watch --url

# An auth token — copy it:
turso db tokens create mev-watch
```

Keep the URL and token; they become `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.

## 2. Apply the schema to Turso

From the repo root, temporarily point your local `.env` at Turso:

```
DATABASE_URL=libsql://mev-watch-<your-org>.turso.io
DATABASE_AUTH_TOKEN=<the token from step 1>
```

Then create the tables:

```bash
pnpm db:migrate
```

## 3. Seed production history

With `.env` still pointing at Turso, backfill the history from relayscan.io:

```bash
pnpm seed-history
```

This takes several minutes (~one request per day since the Merge). When it
finishes, **restore `.env`** to the local file URL for day-to-day development:

```
DATABASE_URL=file:./data/mevwatch.db
DATABASE_AUTH_TOKEN=
```

## 4. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and **Add New → Project**.
2. Import the GitHub repo `Labrys-Group/mev-watch` (select the branch you want
   to deploy).
3. Framework preset: **Next.js**. Leave the build command and output directory
   at their defaults.
4. Do not deploy yet — set the environment variables first (next step).

## 5. Set Vercel environment variables

In **Project Settings → Environment Variables**, add (for Production):

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Turso `libsql://` URL from step 1 |
| `DATABASE_AUTH_TOKEN` | the Turso token from step 1 |
| `CRON_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `SLACK_WEBHOOK_URL` | *(optional)* a Slack incoming-webhook URL for failure alerts |
| `ETH_RPC_URL` | *(optional)* an Ethereum JSON-RPC URL for the non-MEV-boost block count; falls back to public RPCs when unset |

Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
invocations once `CRON_SECRET` is set — that is how `/api/refresh` is protected.

Now trigger the deploy.

## 6. Verify

- The deployed homepage loads and shows live data.
- **Project → Cron Jobs** lists the `/api/refresh` job (from `vercel.json`).
- Manually confirm the refresh endpoint:

  ```bash
  curl -s https://<your-deployment>/api/refresh \
    -H "Authorization: Bearer <your CRON_SECRET>"
  # → {"status":"ok","date":"YYYY-MM-DD"}
  ```

  Without the header it must return `401`.

## 7. Custom domain

In **Project Settings → Domains**, add `mevwatch.info` and point its DNS at
Vercel as instructed.

## Upgrading an existing database

When a release adds a Drizzle migration, an already-live Turso database must be
migrated — and, for the non-MEV-boost data, backfilled. With `.env` temporarily
pointing at Turso (as in steps 2–3):

```bash
pnpm db:migrate          # apply new migrations (e.g. the total_chain_blocks column)
pnpm backfill-nonboost   # populate nonBoostPct / totalChainBlocks across all history
```

`backfill-nonboost` is idempotent and doubles as a repair tool for any day a
live refresh recorded without a block count. Restore `.env` to the local file
URL afterwards.

---

## Notes

- **Cron frequency:** `vercel.json` schedules the refresh daily at 02:00 UTC.
  Vercel's Hobby plan allows once-daily cron; on Pro you can make it more
  frequent by editing the `schedule` cron expression.
- **The refresh is idempotent** — re-running for the same date overwrites that
  day's rows, so a missed or repeated run is harmless.
- **Local development is unaffected** — it keeps using the local `file:` libSQL
  database; only production uses Turso.
