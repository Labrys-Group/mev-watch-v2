# Censorship Chart Restyle — Design

**Date:** 2026-05-23
**Status:** Draft, awaiting user review
**Topic:** Restyle the stacked composition chart — a teal / coral / slate
palette, gradient-to-transparent fills, crisper band lines — while keeping the
existing tooltip and restoring per-band hover nodes.

## 1. Context

The stacked 100% censorship composition chart shipped (spec
`2026-05-22-stacked-censorship-chart-design.md`, implemented across that plan's
seven tasks). On review the palette — pastel green non-censored against red
censored — clashed and read flat. The chart should feel modern and stylised.

This restyle is **visual only**. The data pipeline, the 100% stack, the three
bands, `toCompositionPoint`, the range toggle, and the headline censorship
metric are all untouched.

## 2. Approved direction

Confirmed by the user against live mockups in the visual companion:

- **Palette** — teal non-censored, coral censored, slate non-boosted. No
  green/red pairing; colour-blind safe.
- **Fills** — each band is a vertical gradient from its line fading to near-
  transparent. This reverses the original spec §8 decision ("flat fills, no
  gradients"), at the user's request.
- **Lines** — a crisp ~2 px line on each band's upper edge (was 1 px).
- **Curve** — smoothed (`type="monotone"`, already in place — kept).
- **Tooltip** — the existing custom three-band tooltip is kept unchanged.
- **Hover nodes** — restore a per-band `activeDot` on hover. This reverses the
  original spec §8 decision ("the per-point `activeDot` is dropped"), at the
  user's request. The tooltip cursor line is also kept.

## 3. Colour tokens

Retune three semantic tokens in `src/app/globals.css`, both light and dark.
They are shared with the Epoch Ledger, which shifts to match — intended, as in
the original spec. This **supersedes the values** set by the
`style: retune neutral/ofac tokens to pastel green and red` commit.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--neutral` | non-censored band | `#2E9D95` (teal) | `#3FB8AF` (teal) |
| `--ofac` | censored band | `#EC5F52` (coral) | `#FF6B6B` (coral — unchanged) |
| `--non-boost` | non-boosted band | `#9197A8` (slate) | `#6E7488` (slate) |

The light `--non-boost` moves off the very pale `#C2C4D2` and dark `--non-boost`
off `#565870` so the band's **line** is legible against each background.

`--ofac-fg` / `--neutral-fg` (text-on-colour, used by badges and the Epoch
Ledger) stay as they are — the existing dark foregrounds remain legible on
coral and teal. Confirm visually during implementation; tweak only if a
contrast check fails.

## 4. Chart component — `src/components/sections/trend-chart.tsx`

- Add a `<defs>` block with three vertical `<linearGradient>`s, one per band.
  Each: stop `0%` = the band colour at ~`0.45` opacity, stop `100%` = the same
  colour at ~`0.03`. Stops reference the CSS variables (`var(--neutral)`,
  `var(--ofac)`, `var(--non-boost)`).
- Each `<Area>`: `fill="url(#<gradient-id>)"` with `fillOpacity={1}` (the
  gradient carries the fade); `strokeWidth={2}` (was 1); `type="monotone"` and
  the on-mount sweep animation kept; `dot={false}` kept (no resting dots).
- `activeDot`: each `<Area>` gets an `activeDot` (~`r: 3.5`, a 2 px stroke in
  `var(--background)`, fill in the band's colour) so a node appears on every
  band at the hovered date.
- `<Tooltip content={<ChartTooltip />} cursor={…}>` — unchanged.
- The legend swatches already use the `bg-non-boost` / `bg-ofac` /
  `bg-neutral-relay` token classes, so they retint automatically.

## 5. Out of scope

- The censorship metric, the data pipeline, `toCompositionPoint`, the 100%
  stack, the range toggle, the NOW/PEAK/TROUGH header.
- The e2e test — it asserts three `.recharts-area-area` bands render, which is
  unaffected by a restyle.

## 6. Files

- `src/app/globals.css` — six token-value changes (§3).
- `src/components/sections/trend-chart.tsx` — gradient `<defs>`, `<Area>` fills,
  stroke weight, `activeDot` (§4).
