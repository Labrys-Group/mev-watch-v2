# Deployment

MEV Watch deploys as a read-only Next.js app. Runtime pages and API routes read
checked-in JSON data; there is no production database, migration step, Vercel
cron, or runtime indexer.

## Required Services

- Vercel project connected to this repository.
- GitHub Actions enabled for the repository.
- Optional GitHub secret: `ETH_RPC_URL`, used by the data refresh workflow to
  count daily on-chain blocks. Public RPC fallbacks are used when it is unset.

## Data Refresh

The scheduled workflow at `.github/workflows/update-data.yml` runs daily at
03:30 UTC and can also be triggered manually.

It performs:

```bash
pnpm install --frozen-lockfile
pnpm update-data
pnpm test src/lib/mev-watch-data.test.ts src/lib/mev-watch-generator.test.ts src/config/relays.test.ts src/lib/queries.test.ts
```

When `src/data/mev-watch.json` changes, the workflow commits directly to the
checked-out branch with the GitHub Actions bot identity and pushes the commit.
That push triggers the normal Vercel deployment flow.

## Manual Refresh

To refresh locally:

```bash
pnpm install
ETH_RPC_URL=<optional-rpc-url> pnpm update-data
pnpm test
pnpm build
```

Commit `src/data/mev-watch.json` if the generated diff is expected.

## Vercel Environment

No database or cron secrets are required. If desired, set `ETH_RPC_URL` only in
GitHub Actions repository secrets, not Vercel, because runtime serving does not
fetch upstream data.

## Rollback

Because data is checked into Git, rollback is a normal Git revert of the data
commit or application commit. The live app continues serving the previous
checked-in snapshot if a scheduled refresh fails before committing.
