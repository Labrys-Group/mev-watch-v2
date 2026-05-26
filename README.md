# MEV Watch

A public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks.

Live at **[mevwatch.info](https://mevwatch.info)**.

The site reports, daily, the share of MEV-boost relay payload deliveries that go
through OFAC-censoring relays. Relay posture metadata lives in
`src/data/relays.json`; measured daily snapshots live in
`src/data/mev-watch.sqlite`.

## Stack

Next.js 16 App Router · Tailwind v4 + shadcn/ui · SQLite data artifact ·
Vercel Blob + Cron data refresh · Vitest + Playwright · deployed on Vercel.

## Quick start

Requires Node 24+ and pnpm.

```bash
pnpm install
pnpm update-data --dry-run   # validate the snapshot and print the missing range
pnpm dev                     # http://localhost:3000
```

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | start the dev server |
| `pnpm build` | production build |
| `pnpm lint` / `pnpm test` | ESLint / Vitest |
| `pnpm test:e2e` | Playwright (auto-starts the dev server) |
| `pnpm update-data` | fetch missing complete UTC days and rewrite `src/data/mev-watch.sqlite` |
| `pnpm update-data --dry-run` | validate the snapshot and print the missing date range without network fetches |

## Architecture pointers

- **Data artifact** — `src/data/mev-watch.sqlite` stores canonical raw daily relay,
  builder, and total-chain-block counts.
- **Relay metadata** — `src/data/relays.json` stores editorial relay posture and
  display metadata.
- **Derivations** — `src/lib/mev-watch-data.ts` computes chart, composition, and
  leaderboard view models from raw SQLite rows.
- **Generator** — `scripts/update-data.ts` writes the local SQLite artifact. In
  production, `src/app/api/cron/update-data/route.ts` runs from Vercel Cron and
  publishes the refreshed artifact to Vercel Blob.
- **Public API** — `src/app/api/v1/{summary,trend,relays}` serves read-only JSON
  backed by the same SQLite artifact.

## Docs

- Design and decisions: `docs/superpowers/specs/`
- Phased implementation plans: `docs/superpowers/plans/`
- Methodology (user-facing): `/methodology` on the live site, source at
  `src/app/methodology/page.tsx`
- Production deploy + ops: `docs/DEPLOYMENT.md`
- Working-with-the-codebase guide for AI tools: `CLAUDE.md`

## License

UNLICENSED — public-good transparency tool by [Labrys](https://labrys.io);
contributions welcome via issue or PR.
