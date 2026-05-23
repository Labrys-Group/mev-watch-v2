# Dune Cutover Runbook

Manual steps to flip the relay data source from relayscan's inflated payload aggregates to Dune's per-slot winning-relay attribution. The code for this is on `dev` as of commit `1125284`; this document is the handoff for the **manual** parts.

**Background:**
- Spec: `docs/superpowers/specs/2026-05-24-per-slot-relay-attribution-design.md`
- Plan: `docs/superpowers/plans/2026-05-24-per-slot-relay-attribution.md`
- Why: the current 33% headline double-counts relays that co-deliver the same slot. The new metric attributes each block to its actual winning relay. Expected effect on 2026-05-21: headline drops from 33.4% to roughly 8–18%, matching what you see watching blocks land.

---

## Step 1 — Save the Dune query (≈5 minutes)

1. Sign in at [dune.com](https://dune.com).
2. New query → paste the SQL from `docs/dune/payloads-delivered.sql`.
3. Run it with `date = 2026-05-21`.
4. **Sanity check:** `SUM(num_payloads)` across all relays should be close to **7,178** (the on-chain block count for that day), **not** relayscan's inflated 12,516.
5. If `mevboost.payloads_delivered` doesn't exist, search Dune's catalogue for the canonical table name (`mev_boost.payloads_delivered`, `dune.mevboost.payloads_delivered`, etc.) and update the SQL.
6. Save the query.
7. Copy the numeric query ID from the URL — `dune.com/queries/<this-id>`.

## Step 2 — Provision local env (≈1 minute)

In your local `.env`:

```
DATA_SOURCE_MODE=composite
DUNE_API_KEY=<your-dune-api-key>
DUNE_PAYLOADS_QUERY_ID=<the-id-from-step-1>
```

Get a free `DUNE_API_KEY` at dune.com → Settings → API.

## Step 3 — Smoke-test one day (≈30 seconds)

```bash
pnpm refresh 2026-05-21
pnpm db:summary
```

**Expected:** the latest line drops from 33.4% to somewhere in the **8–18%** band.

If it's still ~33%: the Dune join against `ethereum.blocks` didn't fire. Re-check the SQL is using the join on `block_hash`, and re-run.

## Step 4 — Backfill the full history (≈75–120 min, unattended)

```bash
pnpm db:backfill-dune
```

- Re-ingests every day in the existing range (2022-09-15 → today).
- Concurrency capped at 3 to stay inside Dune free-tier limits.
- Restartable: re-run if it dies partway — it skips dates already marked `ok` with source `dune.com+relayscan.io` in `refresh_log`.
- If `dates.length === 0` on a re-run, it exits 0 with `Nothing to do — all dates in range already backfilled.`

## Step 5 — Visual smoke check

```bash
pnpm dev
```

Open `http://localhost:3000` and confirm:

- Headline % matches what `db:summary` reports.
- Trend chart is continuous — no flat-zero gap suggesting an ingestion break.
- 2023-12-19 visibly has a higher censorship % than 2023-12-17 (the bloXroute Max Profit posture change registers under the new data).

Also click through `/methodology`, `/explorer`, `/status`, `/embed`, `/api/v1/summary`, `/api/v1/trend`, `/api/v1/relays` and confirm nothing is broken.

---

## Production cutover

After local verification passes:

1. Set the three env vars in the Vercel project settings:
   - `DATA_SOURCE_MODE=composite`
   - `DUNE_API_KEY=…`
   - `DUNE_PAYLOADS_QUERY_ID=…`
2. SSH/connect to the prod DB and run `pnpm db:backfill-dune` against it. (Or run it locally pointed at the prod `DATABASE_URL` — same effect.)
3. Verify the live dashboard.
4. Monitor `refresh_log` for any source-string anomalies over the next few days.

## Reversibility

If at any point the new metric reads wrong:

```
DATA_SOURCE_MODE=relayscan
pnpm seed-history
```

Restores the old metric over ≈90 minutes. The composite-tagged `refresh_log` rows are preserved for forensic comparison.

## Task 10 — Make composite the default

After **≥ 1 week** of stable production refreshes with `DATA_SOURCE_MODE=composite`, do the final cleanup:

1. Edit `src/lib/data-source/factory.ts` line that reads:
   ```ts
   const mode = process.env.DATA_SOURCE_MODE ?? "relayscan";
   ```
   Change to:
   ```ts
   const mode = process.env.DATA_SOURCE_MODE ?? "composite";
   ```
2. Update the corresponding test in `src/lib/data-source/factory.test.ts` — the "DATA_SOURCE_MODE is unset" case should now expect `CompositeDataSource`.
3. Remove `DATA_SOURCE_MODE` from Vercel project settings (`DUNE_API_KEY` and `DUNE_PAYLOADS_QUERY_ID` stay).
4. Run `pnpm test` and commit:
   ```
   feat(data-source): make composite the default source
   ```

---

## Known follow-ups (separate work)

- **bloXroute Max Profit classification** — the editorial posture in `src/config/relays.ts` carries a 2023-12-18 posture-change comment that wasn't independently verified against bloXroute's own announcements. This single line accounts for ~17 percentage points of the headline. Worth a separate audit against the ethstaker list and bloXroute's primary sources.
