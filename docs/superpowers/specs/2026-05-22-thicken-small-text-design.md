# Thicken Small Text App-Wide — Design

**Date:** 2026-05-22
**Status:** Approved, ready for implementation planning
**Topic:** Bump small text from weight 400 to weight 500 (`font-medium`)
across the app, so it stops reading thin — most visible in grids and tables.

## 1. Context & problem

The body font is **Spline Sans Mono** (a monospace), set in `globals.css`:

```css
body {
  font-family: var(--font-mono), monospace;
  font-size: 1rem;
  line-height: 1.6;
}
```

The vast majority of small text in the app carries **no explicit font weight**,
so it inherits the default **400 (normal)**. A monospace at 400 looks thin at
small sizes; it gets worse in grids and tables, where the same text is usually
also `text-fg-muted` (foreground at 50% opacity) — uppercase labels, relay IDs,
captions, legends, and table cells all read faint.

The ask: thicken small text. Larger text (headings, hero, big stats) is already
`font-bold`/`font-semibold` and is fine — this change is scoped to small text.

## 2. Decisions (from brainstorm)

| Question | Decision |
|---|---|
| What does "thicken" mean | **Font weight**, not size or colour. Small text keeps its size. |
| Target weight | **500 (`font-medium`)** — the "subtle lift". Removes the thinness without changing the understated, technical feel. |
| Application method | **Per-component `font-medium` utility**, not a global CSS rule. |
| `text-[13px]` data cells | **Left at 400** — bumping those was a heavier option that was not chosen. |
| Already-weighted small text | **Left as-is** — already heavier than 500. |

### Why per-component, not a global rule

The whole codebase styles every size and weight as an explicit Tailwind utility
class — nothing is implicit. Adding `font-medium` per element matches that
convention: it stays greppable and predictable. Rejected alternatives:

- **Attribute-selector CSS hack** (`[class*="text-[10px]"] { font-weight: 500 }`)
  — fragile, fights `font-bold` on specificity, surprising to future readers,
  and does not cleanly cover `text-xs`/`text-sm`.
- **Changing the body default weight** — would thicken headings and large text
  too, which is out of scope.

## 3. Scope — what counts as "small text"

| In scope → add `font-medium` | Out of scope (unchanged) |
|---|---|
| `text-[8px]`, `text-[9.5px]`, `text-[10px]`, `text-[10.5px]`, `text-[11px]`, `text-[12px]`, `text-[12.5px]`, `text-xs`, `text-sm`, `text-[14px]` | `text-[13px]`, `text-[13.5px]`, and every size ≥ `text-[15px]` |

`text-[14px]` is treated the same as `text-sm` (both 14px) for consistency.

Approximate footprint: ~204 small-text occurrences across ~19 files
(`src/components/**` and `src/app/**`). Of those, ~20 already carry an explicit
`font-bold`/`font-semibold`/`font-medium` and are skipped.

## 4. Rules for the edit

For every element whose class list contains an in-scope size token:

1. **If it already sets an explicit font weight** (`font-thin`…`font-bold`) —
   leave it untouched.
2. **Otherwise** — add the `font-medium` utility to its class list.
3. **Shared class constants** (e.g. `TH` in `leaderboard.tsx`) — edit the
   constant once; all its uses inherit the change.

No new utilities, no CSS changes, no markup-structure changes. Weight `font-medium`
only — never `font-semibold` or `font-bold` for this pass.

## 5. Files affected

Small text appears in roughly these files (final list confirmed during
implementation by grepping the in-scope size tokens):

- `src/components/section.tsx`, `src/components/ui/button.tsx`
- `src/components/sections/`: `hero.tsx`, `status-bar.tsx`, `composition.tsx`,
  `epoch-ledger.tsx`, `leaderboard.tsx`, `builder-leaderboard.tsx`,
  `trend-chart.tsx`, `faq.tsx`, `what-to-do.tsx`, `share-strip.tsx`,
  `site-header.tsx`, `site-footer.tsx`
- `src/app/`: `page.tsx`, `methodology/page.tsx`, `api-docs/page.tsx`,
  `explorer/page.tsx`, `embed/page.tsx`, `status/page.tsx`

Note: `text-sm` is also used for body paragraphs on the prose pages
(`methodology`, `api-docs`). Those paragraphs go to 500 as well — accepted as
part of "all small text"; 500-weight body copy stays readable.

## 6. Out of scope

- Text size changes — small text stays small.
- Colour/contrast changes — `text-fg-muted` opacity is unchanged.
- Weights heavier than 500 for any small text.
- `text-[13px]` and larger.

## 7. Testing & verification

- `pnpm lint` and `pnpm build` pass.
- Visual spot-check (dev server) of grid-heavy areas — relay leaderboard,
  builder leaderboard, epoch ledger legend, status bar, composition cards — in
  both light and dark themes: small text reads solid, no layout shift (weight
  change does not alter metrics for a monospace font).
