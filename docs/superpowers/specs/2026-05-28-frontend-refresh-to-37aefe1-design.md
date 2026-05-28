# Frontend Refresh to `37aefe1` — Design

**Date:** 2026-05-28
**Author:** Joshua (via Claude Code)
**Branch:** `front-end-refresh` (from `origin/main`)
**Spec source:** Goal hook set 2026-05-28 — "get the front end back to the content and view of the last commit by joshroylabrys (37aefe1), preserving structural/backend changes."

## Background

Between `37aefe1` (May 25, the last `joshroyLabrys` commit) and `origin/main` (`ee9fae0`, May 28) there are 50 commits authored by Justin Taylor. Those commits mix two distinct kinds of change:

1. **Backend / data-pipeline work** — Vercel Blob ETag race fixes, bootstrap env loading, SQLite-artifact migration, resumable backfill, new `/api/cron/update-data` and `/api/cron/live-ledger-cleanup` routes, `vercel.json` cron schedule, the `src/lib/live-ledger/*` module (replaces the old `src/lib/epochs/*`), `src/lib/data-freshness.ts`. **Keep all of this.**
2. **Frontend redo** — ~40 component / page files reworked, ~+1560 / −860 lines. New "freshness" badges threaded through hero + status bar + embed; composition section rebuilt into a 3-band layout; epoch ledger stripped of all animations and hover tooltips; status page gutted; FAQ converted from paired-toggle to independent cards; methodology + leaderboards + what-to-do rewritten with new terminology ("OFAC-censoring" → "censoring", "neutral" → "non-censoring", "blocks" → "deliveries"). **This is what we're rolling back, in place, without touching backend wiring.**

This is a restyle, not a file revert. The visual + content target is `37aefe1`; the underlying data shapes and module boundaries remain the new ones.

## Goal

Ship a `front-end-refresh` branch whose user-visible surface matches `37aefe1` for every page and section, while continuing to consume the new backend (`live-ledger/*`, `data-freshness.ts`, SQLite artifact via Blob, new cron routes). Open a PR against `main` — no auto-merge.

## Scope

**In scope (UI / copy only):**

- All `src/components/sections/*.tsx`
- `src/components/skeletons/*.tsx`
- `src/app/page.tsx` (if any wiring change is needed to pass props)
- `src/app/methodology/page.tsx`
- `src/app/embed/page.tsx`
- `src/app/globals.css` (epoch-ledger animation rules)
- `src/config/faq.ts` (terminology + FAQ Q2 special-case)

**Explicitly out of scope:**

- `src/lib/**` (no library / data-fetching changes)
- `src/app/api/**` (no route changes)
- `src/lib/live-ledger/**`, `src/lib/data-freshness.ts`, `src/lib/queries.ts`, `src/lib/mev-watch-*.ts`, `src/lib/composition.ts`, `src/lib/metrics.ts`
- `scripts/**`

**Added to scope mid-execution (was deferred, then pulled forward):**

- `src/data/relays.json` — make the active set match relayscan's mainnet poll list exactly. Removes two phantoms (`relay-filtered.ultrasound.money`, `regional.titanrelay.xyz`) that relayscan doesn't poll. Activates two relays relayscan does poll (`relay.edennetwork.io`, `relay.btcs.com`). Resolves the ~90% live-ledger censorship reading at its root cause.
- `next.config.ts`, `vercel.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `Taskfile.yml`
- `src/app/status/page.tsx` — user opted to leave Justin's minimal snapshot view as-is
- `package.json`, `pnpm-lock.yaml`
- All test files, except where the test asserts on copy that we're reverting (then the test gets updated to match)
- CLAUDE.md (already reflects new architecture intentionally)

## Per-file plan

**Class:** **A** = pure text/CSS revert · **B** = hybrid (keep new data wiring, revert JSX/copy) · **C** = port required (new backend module + visual restyle)

### Home page sections

| File | Class | Action |
|---|---|---|
| `src/components/sections/hero.tsx` | B | Keep `freshness: DataFreshness` prop wiring. Remove the "Daily data through X" badge (~lines 48–56 on origin/main). Revert readme box to hardcoded `37aefe1` copy. Remove `isStale` conditional. |
| `src/components/sections/hero.data.tsx` | B | Keep parallel `Promise.all` with `getLatestStats`/`getLastRefresh`/`getTrend` and `getDataFreshness`. Only revert the empty-state seed-command string (`pnpm update-data` → `pnpm seed-history`). |
| `src/components/sections/status-bar.tsx` | B | Keep `freshness` prop. Revert mobile grid to `grid-cols-[auto_1fr_1fr]`. STATUS cell back to hardcoded "LIVE" + `animate-pulse` + `bg-good`. Drop the `Xd old` age badge. Drop the `mobileLabel` prop. |
| `src/components/sections/status-bar.data.tsx` | B | Keep freshness computation, revert empty-state copy. |
| `src/components/skeletons/status-bar.skeleton.tsx` | A | Revert grid to 3-col layout to match reverted live component. |
| `src/components/sections/composition.tsx` | B | Big JSX revert: drop the 3-band layout. Restore the 2-tile + epoch-ledger grid + legend strip from `37aefe1`. **Wire the restored JSX to the props** — `37aefe1`'s version was an async server component that called `getLiveEpochs()` directly, but that lib path no longer exists. The restored layout must read its ledger data from the `ledger` prop and its source-label / staleness from `freshness`, both passed down from `composition.data.tsx`. Revert title "Censoring vs. non-censoring relays" → "Censoring vs. neutral relays". Revert "DELIVERIES" → "BLOCKS". |
| `src/components/sections/composition.data.tsx` | B | Keep parent-fetching shape (`readInitialLedger`, `getLastRefresh`, `getDataFreshness`). Revert title + fallback copy. |
| `src/components/skeletons/composition.skeleton.tsx` | A | Revert to `37aefe1`'s epoch-grid + 2-tile placeholder. |
| `src/components/sections/trend-chart.tsx` | B | Revert to Recharts `ResponsiveContainer` (drop the manual `chartSize` observer). Revert tooltip + legend label "Non-censoring" → "Non-censored". Preserve the `37aefe1` "SHARE OF ALL BLOCKS" / "OF MEV-BOOST" denominator split (`37aefe1` itself introduced this). |
| `src/components/sections/trend-chart.data.tsx` | A | Revert seed-command string. |
| `src/components/sections/leaderboard.tsx` | A | Revert section label "04" → "03", title "Ranked by delivery share" → "Ranked by block share", column header "DELIVERIES" → "BLOCKS", badges "CENSORING" → "OFAC" and "NON-CENSORING" → "NEUTRAL". |
| `src/components/sections/builder-leaderboard.tsx` | A | Revert label "05" → "04". |
| `src/components/sections/what-to-do.tsx` | A | Revert step 02 title "censoring relays" → "OFAC-compliant relays". Revert step 03 title "non-censoring relays" → "neutral relays". Revert section label "05" → "03". |
| `src/components/sections/faq.tsx` | B | Revert from independent-toggle `FaqCard` back to paired-toggle `FaqPair` (shared open state per pair). |

### Epoch ledger — port required

| File | Class | Action |
|---|---|---|
| `src/components/sections/epoch-ledger.tsx` | C | Restore `37aefe1`'s interactive feel: stagger entry animations, row-collapse on epoch shift, hover tooltips via `createPortal`, "Reconnecting…" indicator on poll failure, 10s poll interval. **Drop the new status badges** (Cache stale / Degraded relays / Slot CENSORING). The old `src/lib/epochs/*` module is gone — port all imports and types to `src/lib/live-ledger/types` (SlotCategory, LedgerData with new fields `headSlot` and `degradedRelays`). Adapt `diffLedger` and `classifyRelay` equivalents to the new types, or re-introduce a thin compat layer in the component file rather than restoring the deleted lib module. |
| `src/app/globals.css` | A | Restore the ~30 lines of epoch-ledger animation rules (`.epoch-tile`, `.epoch-row-wrap`, `.epoch-row-wrap--collapsed`, related keyframes) and the `prefers-reduced-motion` overrides. |

### Static pages

| File | Class | Action |
|---|---|---|
| `src/app/methodology/page.tsx` | B | Revert terminology globally ("OFAC-censoring" / "neutral" / "OFAC RELAY CLASSIFICATION"). Keep the `relay.posture === "neutral" ? "non-censoring" : relay.posture` display transform in the relay table (it's a display tweak, not data-shape). **Two exceptions where we keep Justin's factually-correct wording:** (i) the Data Source paragraph that says "Vercel Cron job ... SQLite artifact stored in Vercel Blob" — this is the actual current architecture; the old "immutable snapshot to the MEV Watch database" wording is stale. (ii) Limitation #3 reference to `relays.json` — keep, because `src/data/relays.json` is now the actual editorial config (per CLAUDE.md line 49). For **Limitation #4**, restore the longer `37aefe1` title ("Headline is daily; the live ledger is a separate view") and body that mentions the epoch ledger polling relays — but update the "ingestion run" phrasing to acknowledge the Blob-backed snapshot refresh model. Suggested merged body: *"The headline censorship percentage is a daily snapshot. Intra-day changes in relay composition do not move it until the next UTC day's snapshot refresh (now persisted as a SQLite artifact in Vercel Blob). The epoch ledger on the dashboard polls the relays' own data APIs and displays per-slot outcomes on a much shorter refresh window, but is scoped to the last ~1024 slots and is not used to compute the headline percentage."* |
| `src/app/embed/page.tsx` | B | Drop the freshness badge (`<p>...{freshness.sourceLabel}</p>`) + the new `getLastRefresh`/`getDataFreshness` imports + the `freshness` const. Keep the shorter metadata title "Embed". |
| `src/config/faq.ts` | B | Revert Q5 terminology ("non-censoring relays" → "neutral relays"). Revert all Q1/Q3/etc. "censoring" → "OFAC-censoring" mentions. **Q2 — keep Justin's expanded answer** clarifying that OFAC is one censorship regime among many; only the question wording reverts to the `37aefe1` phrasing if it differs. |

### Status page — no change

| File | Class | Action |
|---|---|---|
| `src/app/status/page.tsx` | — | Leave as-is per user decision. Justin's minimal snapshot view stays. |

## Cross-cutting cleanups

- **Seed-command copy:** every empty-state that says `pnpm update-data` reverts to `pnpm seed-history`. Caught in `hero.data.tsx`, `status-bar.data.tsx`, `composition.data.tsx`, `trend-chart.data.tsx`, and the `hero.tsx` JSX itself.
- **Section numbering:** the `<Section label="NN / …" />` prop inside each component shifted (Composition stayed `01 / POST-MERGE COMPOSITION`, Trend stayed `02`, Leaderboard `03→04`, Builder `04→05`, What-to-do `03→05`). Re-sequence to `37aefe1`'s numbering: Composition 01, Trend 02, Relay 03, Builder 04, What-to-do 05. Methodology section labels (inside `src/app/methodology/page.tsx`) shifted similarly (`05 / OFAC RELAY CLASSIFICATION` → `05 / RELAY CLASSIFICATION`) — revert those too. Verify each label against the `37aefe1` source file before committing.

## Commit strategy

One commit per coherent grouping so the PR diff is reviewable surface-by-surface:

1. `chore: branch off origin/main` (already done — `d76d0f6`)
2. `refactor(hero): revert to 37aefe1 stat card + readme copy; keep freshness wiring`
3. `refactor(status-bar): revert mobile grid + LIVE cell; keep freshness wiring`
4. `refactor(composition): restore 2-tile + epoch-grid layout; keep ledger/freshness props`
5. `refactor(trend-chart): restore ResponsiveContainer + revert tooltip label`
6. `refactor(leaderboards): revert section labels + OFAC/NEUTRAL badges + BLOCKS column`
7. `refactor(faq): revert FaqCard → FaqPair; revert Q5 terminology; keep Q2 expansion`
8. `refactor(methodology): revert terminology + Limitation #4; keep Vercel Blob accuracy in Data Source`
9. `refactor(embed): drop freshness badge; keep shorter title`
10. `refactor(what-to-do): revert step titles + section label`
11. `feat(epoch-ledger): restore animations + hover tooltips + reconnect indicator, port to live-ledger/types`
12. `style(globals): restore epoch-ledger animation rules + reduced-motion overrides`
13. `chore(skeletons): re-sync skeletons to reverted components`

If any of the above touches a unit / e2e test (e.g., `leaderboard.test.tsx` asserts on "DELIVERIES"), update the test in the same commit.

## Verification

Run in this order on the branch before opening the PR:

1. `pnpm lint` — must pass.
2. `pnpm test` — Vitest suite, must pass. Expect some test files (faq.test, leaderboard.test, hero.test, composition.test, status-bar.test) to need text updates.
3. `pnpm build` — production build, must succeed.
4. `pnpm dev` — start local server. Walk through:
   - Home page at `localhost:3000` — hero, status bar, composition (incl. live epoch ledger animations), trend chart, leaderboards, faq, what-to-do.
   - `/methodology` — terminology + Limitation #4 wording + relays table.
   - `/embed` — confirm no freshness badge.
   - `/status` — confirm unchanged (still Justin's minimal view).
   - **Mobile responsiveness:** Chrome DevTools at 375px width — confirm status bar 3-col layout doesn't spill, composition fits, faq cards stack, leaderboards horizontal scroll behaves.
5. `pnpm test:e2e` — Playwright suite (auto-starts dev server). `e2e/mobile.spec.ts` in particular should pass given the mobile-grid revert.

## Rollout

- Push `front-end-refresh` to `origin`.
- Open PR against `main` with summary linking this spec.
- **Do not auto-merge.** User reviews diff in GitHub before deciding.
- After merge, the next Vercel deploy ships the refresh. No DB migration or env var changes required (this is UI-only).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Epoch ledger port breaks live polling because `live-ledger/types` shape differs from old `epochs/get-live-epochs` types | Port and run dev server with network panel open; verify `/api/epochs` response still drives the grid. Adapt the compat layer in the component file, not by reviving the deleted lib module. |
| Composition.tsx revert loses access to `freshness` or `ledger` props because the new parent passes them | Keep the props in the function signature; only revert the JSX subtree below. Use TypeScript to catch the prop break. |
| A test that asserts on Justin's copy (e.g., "DELIVERIES" in `leaderboard.test.tsx`) breaks | Update the test assertions in the same commit that changes the copy. Don't disable or skip tests. |
| Globals.css restoration collides with current selectors | Diff carefully — the deleted rules used `.epoch-tile`, `.epoch-row-wrap`, etc. If origin/main re-uses any of those class names for a different purpose, namespace the restored rules. (Quick `git grep` before commit.) |
| Limitation #4 merged wording reads awkwardly | Render the methodology page in dev and read it back. Adjust prose until it reads naturally. |

## Backend / data investigation (added 2026-05-28)

The original brief was "no logic or backend changes." During spec review the user flagged a live-data symptom: **the epoch ledger is showing ~90% of slots as censoring** — a value that doesn't match the trend chart's daily headline (which sits in the ~50–55% range historically). This triggered a focused investigation of every backend change Justin made on top of `37aefe1`.

### Findings

**1. The classification logic itself is unchanged.** `src/lib/live-ledger/snapshots.ts:classifySlot()` uses the same "censoring path wins" rule that `37aefe1`'s `src/lib/epochs/classify.ts:classifySlot()` used, byte-for-byte. Both say: if any relay in the delivery set is censoring, the slot is censoring; otherwise neutral; empty set → nonboost. Not the regression.

**2. The daily metric (`src/lib/metrics.ts:computeDailyStats`) is unchanged in formula.** Justin inlined the `RelayPayloadCount` / `BuilderBlockCount` type definitions (previously imported from a `data-source/types` module he deleted), and improved `nonBoostShare` to return `number | null` when block counts are missing. Both are safe refactors. Censorship percentage formula is identical: `(censoring_payloads / total_payloads) * 100`.

**3. Chain-time constants identical** (`GENESIS_TIME`, `SECONDS_PER_SLOT`, `SLOTS_PER_EPOCH`). Not the regression.

**4. The regression IS in `src/data/relays.json`.** Justin added two new ACTIVE censoring entries that did not exist in `37aefe1`'s `src/config/relays.ts`:

   - `relay-filtered.ultrasound.money` (Ultra Sound Filtered) — `posture: "censoring"`, `active: true`
   - `regional.titanrelay.xyz` (Titan Relay Regional) — `posture: "censoring"`, `active: true`

   These are real relay endpoints — operator-run sibling variants of the major neutral relays (Ultra Sound main, Titan main). Because builders typically submit the same bid simultaneously to *all* of an operator's relay endpoints, blocks delivered by the neutral Ultra Sound main are also visible in Ultra Sound Filtered's `/proposer_payload_delivered` records — and the existing "any censoring relay in the delivery set wins" rule then flips those slots to censoring. The same effect compounds through Titan main + Titan Regional. With Flashbots (~40–60% share, censoring) already pulling the baseline up, the addition of two more high-volume censoring contributors that share their candidate pool with the largest neutral relays plausibly drives the per-slot censorship rate to the ~90% the user is observing.

   `37aefe1` excluded these variants — presumably as a deliberate methodology choice, since their inclusion under "censoring path wins" double-counts neutral blocks as censoring without any way to attribute the delivery to the validator's actual selected relay.

### Fix path (shipped on this branch after audit)

After confirming against relayscan's own `config-mainnet.yaml`, ethstaker's MEV relay list, and Ultra Sound's own website that `relay-filtered.ultrasound.money` does not appear anywhere as a real Ultra Sound endpoint (Ultra Sound describes a single "credibly-neutral and permissionless" relay) and `regional.titanrelay.xyz` is not in relayscan's poll list, the fix is data-only: make our active set mirror relayscan's exact 10-relay poll list.

Changes applied to `src/data/relays.json`:

- **Removed (not polled by relayscan):**
  - `relay-filtered.ultrasound.money` (no evidence this endpoint exists)
  - `regional.titanrelay.xyz` (real per ethstaker but not in relayscan's config)
- **Activated (relayscan polls them, we had them inactive):**
  - `relay.edennetwork.io` — Eden Network, posture `censoring` (carried from prior historical entry)
  - `relay.btcs.com` — BTCS, posture `censoring` (carried from prior historical entry; "BTCS markets this explicitly as an OFAC-compliant relay" per project history)

`src/config/relays.test.ts`'s "verified current relay table" assertion is updated to the new 10-relay list. All other postures (8 of 8 that overlap with ethstaker) match canonical sources and are unchanged.

Effect on the live ledger: removes the phantom-sibling double-count, dropping the live-ledger censorship reading from ~90% toward the daily headline's ~50–55% range. Effect on the daily snapshot pipeline: minor — relayscan never reported the two phantoms (so removing them changes nothing in historical days), and Eden + BTCS counts now flow through (negligible market share but they no longer get classified `unknown`).

## Open questions

None at spec-write time. All six decision points were answered in the brainstorming round on 2026-05-28; the backend investigation was added on user request during spec review.

## Out of scope (followups)

- Backfill recompute for any persisted SQLite days that included the two now-removed phantom relays. Only the live ledger is affected day-to-day; the daily snapshot pipeline never ingested them.
- Methodology page edit acknowledging the "censoring path wins" rule and its limitation when relay-operator pools overlap.
- Status page redesign (user kept Justin's minimal version; revisit later if desired).
- The composition daily-bars concept Justin introduced (skipped per user decision; could revisit as a future feature).
- The freshness-badge UX in hero/status-bar/embed (removed per user; could revisit as a softer indicator later).
