# UI/UX Review Fixes — Design

**Date:** 2026-05-26
**Status:** Draft, for a separate PR
**Topic:** Fix the current dashboard UX issues found on the `codex/review` branch: stale data disclosure, live-vs-snapshot context, relay delivery terminology, section order, FAQ card behavior, and duplicated page titles.

## 1. Context

The current branch has moved from the old JSON snapshot to `src/data/mev-watch.sqlite` plus a live epoch ledger. The homepage now renders non-empty metrics, but the checked-in SQLite artifact is stale:

- `sourceStartDate = 2022-09-15`
- `sourceEndDate = 2023-10-24`
- `generatedAt = 2026-05-25T07:07:43.521Z`
- latest daily relay payload deliveries = `11,869`
- latest builder blocks = `6,591`

The homepage still presents the daily metrics as current-looking dashboard data: the status bar says `STATUS LIVE`, the hero says `CENSORSHIP IS FALLING`, the embed renders `33.4%`, and the live epoch ledger appears in the same composition section as the stale daily snapshot. On mobile, the `DATA THROUGH` cell is hidden, which removes the strongest freshness clue from the first viewport.

The UI also still contains issues that predate the SQLite branch:

- relay payload deliveries are labelled as `blocks` in several places, even though the metric layer documents that relay `num_payloads` counts deliveries and can count the same block once per relay
- homepage section labels render out of sequence: `01`, `02`, `04`, `05`, `03`, `06`
- FAQ cards open in paired rows, so clicking one FAQ also expands the neighboring card in that row
- route metadata duplicates the product name in page titles, for example `Status | MEV Watch | MEV Watch`

## 2. Goals & non-goals

**Goals**
- Make stale daily data obvious in the main dashboard, mobile status bar, status page, and embed.
- Keep the live epoch ledger, but visually and verbally distinguish it from historical daily snapshot metrics.
- Rename relay payload totals from "blocks" to "deliveries" wherever the value comes from `relay_counts.num_payloads`.
- Keep true builder block totals labelled as blocks.
- Put homepage section numbering back in visible reading order.
- Make FAQ cards expand independently so only the clicked question opens.
- Remove duplicated `MEV Watch` from route titles.
- Add focused tests so these regressions are caught without needing full browser E2E coverage.

**Non-goals**
- Do not redesign the dashboard visual language.
- Do not change censorship metric formulas.
- Do not change relay posture classification rules.
- Do not change the SQLite schema unless a naming helper requires a non-breaking TypeScript type alias.
- Do not solve the upstream data freshness pipeline in this PR; this spec only prevents stale data from being misrepresented in the UI.

## 3. Product behavior

### Freshness states

Introduce a small freshness view model derived from `latest.date`, `lastRefresh.ranAt`, and the current date:

```ts
type DataFreshnessStatus = "fresh" | "stale" | "empty";

type DataFreshness = {
  status: DataFreshnessStatus;
  sourceDate: string | null;
  sourceAgeDays: number | null;
  generatedAt: Date | null;
  generatedAgeLabel: string | null;
  sourceLabel: string;
};
```

Suggested thresholds:

- `empty`: no latest daily stats
- `fresh`: source day is at most 3 complete UTC days behind now
- `stale`: source day is more than 3 complete UTC days behind now

The threshold should be a named constant, for example `STALE_SOURCE_DAY_THRESHOLD_DAYS = 3`, so tests can assert behavior without scattering magic numbers.

### Status bar

Desktop:

- Keep the network/status/censorship cells.
- If daily data is stale, replace the generic `STATUS LIVE` value with a stale daily-data state such as `DAILY STALE`.
- Keep live-specific language out of the daily aggregate status cell.
- Always show `DATA THROUGH 2023-10-24` and an age indicator when stale.
- Keep the live ledger status separate, either inside the ledger panel or as a small `LIVE LEDGER` label.

Mobile:

- Do not hide freshness. The mobile status bar should show at least:
  - daily status, for example `STALE`
  - `THROUGH 2023-10-24` or `945d old`
  - censorship percentage
- Avoid wrapping into a tall multi-line bar. Use abbreviated labels and fixed cells.

### Hero and embed

If daily data is stale:

- The hero may still show the metric, but supporting copy must disclose the source day before making trend claims.
- Avoid current-tense claims such as "shows that share falling over time" without context.
- Add a compact stale badge or timestamp near the headline statistic: `Daily data through 2023-10-24`.

The embed has less context than the homepage, so it must include freshness in the card itself:

- `33.4%`
- `Daily snapshot through 2023-10-24`
- `OFAC-censoring relay delivery share`

If the source is stale, the embed should not read as a real-time widget.

### Live ledger separation

The live epoch ledger can remain in the composition section, but it must be framed as a separate live window:

- Label it `Live epoch ledger` and include `live` only in that panel.
- Add a short sublabel such as `Recent slots, independent of the daily snapshot`.
- If the daily snapshot is stale, the composition section should make the contrast explicit:
  - daily aggregate card: `Daily snapshot through 2023-10-24`
  - live ledger card: `Live recent slots`
- The live ledger should not make the whole composition section appear current.

### Terminology

Use these labels consistently:

- Relay aggregate counts from `relay_counts.num_payloads`: **deliveries**
- Relay leaderboard caption: `Top relays by delivery share`
- Relay table count column: `DELIVERIES`
- Composition aside: `N = 11,869 DELIVERIES`
- Composition count cards: `MEV-Boost deliveries`
- Embed line: `OFAC-censoring relay delivery share`
- Builder counts from `builder_counts.num_blocks`: **blocks**
- Builder leaderboard caption and column remain `blocks` / `BLOCKS`

Type names can remain `blocks` internally for a small PR if changing them would create noisy churn, but UI copy and test names should use "deliveries" for relay payload counts.

### Section order

Make visible numbering match reading order. Either:

1. Move `WhatToDo` before both leaderboards so `03 / WHAT TO DO` appears after the trend chart, or
2. Renumber the current order:
   - `03 / RELAY LEADERBOARD`
   - `04 / BUILDER LEADERBOARD`
   - `05 / WHAT TO DO`
   - `06 / FAQ`

Prefer option 1 if product flow should move from metric to action before detailed tables. Prefer option 2 if the current layout order is intentional.

### FAQ card behavior

FAQ expansion should be per card, not per visual row. Clicking one question should expand only that answer and leave its neighboring card collapsed.

Current behavior comes from row-pair state in `FaqPair`: each two-item pair shares one `open` boolean. Replace this with independent item state. Acceptable options:

1. Move `open` state into each individual FAQ card component.
2. Track open item IDs in the parent `Faq` component.
3. Use native `<details>` per FAQ item if the visual styling and animation remain consistent.

Keep the existing full-card click target and keyboard-accessible button semantics. The layout may still use CSS grid rows, but the closed neighboring card must not reveal answer content or show an expanded indicator.

### Metadata titles

Route-level metadata titles should not include the product suffix if the root layout template appends it.

Use:

```ts
export const metadata = {
  title: "Status",
};
```

and:

```ts
export const metadata = {
  title: "Embed",
};
```

Expected rendered titles:

- `/status`: `Status | MEV Watch`
- `/embed`: `Embed | MEV Watch`

## 4. Proposed implementation

### Freshness helper

Add a small server-safe helper, for example `src/lib/data-freshness.ts`.

Responsibilities:

- parse `YYYY-MM-DD` source dates as UTC days
- compute complete-day age against a provided `now` for deterministic tests
- classify empty/fresh/stale
- return concise labels for status bar, hero, status page, and embed

Keep formatting separate from data reads so the helper can be unit-tested without opening SQLite.

### Query surface

No new database query is required if existing callers already have:

- `getLatestStats()`
- `getLastRefresh()`

Where a component needs both stats and freshness, fetch them together and pass a `DataFreshness` prop down to display components. Avoid recomputing date age independently in client components.

### Components to update

- `src/components/sections/status-bar.tsx`
  - accept freshness props
  - distinguish daily aggregate status from live ledger status
  - expose freshness on mobile

- `src/components/sections/status-bar.data.tsx`
  - build freshness from latest stats and last refresh
  - preserve empty-state behavior

- `src/components/sections/hero.tsx` and `hero.data.tsx`
  - show source date / stale badge when stale
  - soften current-tense copy if stale

- `src/app/embed/page.tsx`
  - show snapshot source date
  - rename "blocks" to "relay delivery share"
  - avoid real-time implication when stale

- `src/components/sections/composition.tsx`
  - rename `BLOCKS` to `DELIVERIES` for relay totals
  - add daily snapshot source label
  - frame `EpochLedger` as live recent slots independent from the daily snapshot

- `src/components/sections/leaderboard.tsx`
  - caption: `Top relays by delivery share`
  - table column: `DELIVERIES`
  - total label: `deliveries`

- `src/components/sections/builder-leaderboard.tsx`
  - no terminology change except any nearby copy needed to distinguish builder blocks from relay deliveries

- `src/app/page.tsx` and section label constants
  - fix section order or numbering

- `src/components/sections/faq.tsx`
  - remove shared row-pair open state
  - keep each FAQ item independently controlled
  - preserve accessible `aria-expanded` / `aria-controls` behavior

- `src/app/status/page.tsx`
  - title becomes `Status`
  - add stale-specific language when source day is old

- `src/app/layout.tsx`
  - no change expected unless title template behavior changes in current Next docs

Because this is Next 16, read the relevant docs in `node_modules/next/dist/docs/` before editing metadata or route behavior.

## 5. Testing

Unit tests:

- `data-freshness` classifies empty/fresh/stale correctly with a fixed `now`
- source day age uses UTC day boundaries, not local browser timezone
- stale labels include the source date and age

Component tests:

- status bar desktop renders stale daily-data state when source date is old
- status bar mobile-visible text includes freshness, not just `LIVE` and percentage
- relay leaderboard renders `DELIVERIES` and not `BLOCKS`
- builder leaderboard still renders `BLOCKS`
- composition aside renders `DELIVERIES`
- embed renders source date and delivery-share wording
- homepage section labels are in increasing visible order
- clicking one FAQ card opens only that FAQ answer
- FAQ sibling cards in the same row remain collapsed after one card is opened

Metadata tests:

- `/status` title resolves to `Status | MEV Watch`
- `/embed` title resolves to `Embed | MEV Watch`

Manual browser checks:

- desktop `/` shows stale daily snapshot context in the first viewport
- mobile `/` shows freshness in the sticky status bar
- `/status` clearly reports source day age
- `/embed` does not look like a real-time widget when data is stale
- no horizontal overflow at 390px width

Suggested commands:

```bash
pnpm test
pnpm lint
pnpm build
```

## 6. Acceptance criteria

- A user can tell from the homepage first viewport when daily aggregate data is stale.
- A mobile user can see data freshness without opening `/status`.
- The live epoch ledger is labelled as live recent slot data, not as proof that daily aggregate metrics are current.
- Relay payload count UI says deliveries, not blocks.
- Builder count UI still says blocks.
- Section labels increase in visual order.
- FAQ cards open independently.
- `/status` and `/embed` titles do not duplicate `MEV Watch`.
- Existing public API response shapes remain unchanged.

## 7. Risks and mitigations

- **Over-warning users when data is only slightly delayed:** use a small threshold, not a same-day requirement.
- **Confusing live ledger with daily metrics:** split labels and source dates directly in the composition section.
- **Terminology churn in TypeScript types:** prioritize UI copy first; internal type renames can be deferred if noisy.
- **Timezone mistakes:** compute source age by UTC calendar days and test around boundaries.
- **Next metadata behavior drift:** verify against installed Next 16 docs before editing metadata.

## 8. Open questions

- What stale threshold should production use: 2, 3, or 7 complete UTC days?
- Should stale daily data suppress the hero verdict word entirely, or keep it with a clear stale badge?
- Should the embed expose both generated age and source date, or only source date to stay compact?
- Should the status bar reserve a separate `LIVE LEDGER` cell on desktop, or keep live status only inside the ledger panel?
