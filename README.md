# MEV Watch

A public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks.

Live at **[mevwatch.info](https://mevwatch.info)**.

The site reports, daily, the share of MEV-boost relay payload deliveries that go through OFAC-censoring relays, plus a live epoch ledger showing the most recent slots and the relays that won them. The OFAC-posture classification of each relay is editorial and tracked in `src/config/relays.ts`.

## Stack

Next.js 16 App Router · Tailwind v4 + shadcn/ui · libSQL (Turso in prod, local file in dev) · Drizzle ORM · Vitest + Playwright · deployed on Vercel.

## Quick start

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env       # local libSQL file is the default
pnpm db:migrate            # apply schema
pnpm refresh               # fetch yesterday's snapshot
pnpm dev                   # http://localhost:3000
```

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | start the dev server |
| `pnpm build` | production build |
| `pnpm lint` / `pnpm test` | ESLint / Vitest |
| `pnpm test:e2e` | Playwright (auto-starts the dev server) |
| `pnpm db:generate` / `pnpm db:migrate` | generate / apply a Drizzle migration |
| `pnpm refresh [date]` | fetch + store one day of relay stats (default: yesterday) |
| `pnpm seed-history [start] [end]` | backfill historical daily snapshots |
| `pnpm backfill-nonboost` | repair tool: populate `nonBoostPct` / `totalChainBlocks` across history |
| `pnpm db:summary` | print snapshot row count and the latest day |

## Architecture pointers

- **Data pipeline** — `src/lib/refresh/` (daily snapshot, written by the `/api/refresh` cron) and `src/lib/epochs/` (live per-request polling of each relay's data API).
- **Schema** — `src/lib/db/schema.ts`. Migrations in `drizzle/`.
- **Metric** — `src/lib/metrics.ts` (per-payload share). A per-slot honest metric is in flight; see `docs/superpowers/specs/2026-05-24-per-slot-honest-metric-design.md`.
- **Editorial relay config** — `src/config/relays.ts`.
- **Public API** — `src/app/api/v1/{summary,trend,relays}` (read-only JSON). Refresh health at `/status`.

## Docs

- Design and decisions: `docs/superpowers/specs/`
- Phased implementation plans: `docs/superpowers/plans/`
- Methodology (user-facing): `/methodology` on the live site, source at `src/app/methodology/page.tsx`
- Production deploy + ops: `docs/DEPLOYMENT.md`
- Working-with-the-codebase guide for AI tools: `CLAUDE.md`

## License

UNLICENSED — public-good transparency tool by [Labrys](https://labrys.io); contributions welcome via issue or PR.
