# Dynamic 30-Day Hero Verdict — Design

**Date:** 2026-05-22
**Status:** Approved, ready for implementation planning
**Topic:** Replace the Hero's all-time-peak comparison with a dynamic verdict
based on the censorship trend **over the last 30 days**, driving a four-state
headline word and a preset message.

## 1. Context & problem

The homepage Hero (`src/components/sections/hero.tsx`) currently derives its
headline word and stat line from a **current-vs-all-time-peak** comparison:

```ts
const drop = (summary.peak - summary.current).toFixed(1);
const isFalling = summary.current <= summary.peak - 5;   // → "FALLING" | "HIGH"
```

Because censorship has fallen far from its 2022 peak, this is permanently stuck
on `FALLING` — it no longer tells a visitor what is happening *now*. The ask: a
**month-over-month** verdict that reflects recent movement, with a preset
message for each situation (resistance strong / decreasing / increasing /
censorship taking over).

The peak/all-time view is not lost — the Trend Chart below the Hero still shows
the full history.

## 2. Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Which element | The **Hero section** — its existing dynamic headline word and stat line. |
| Comparison basis | **30 days** (month-over-month). |
| Change metric | **Relative percent** — `(now − then) / then × 100`. |
| Endpoint smoothing | **7-day averages**, not single days — point-to-point swings −32%→+22% within months; smoothing + a wide flat band keep the verdict honest. |
| Flat band | **±10%** relative change → treated as "no real movement". |
| Level line | **50%** censorship → the majority tipping point splitting "flat" into resistance-strong vs. censorship-winning. |
| Both thresholds | Single-line constants in one module — the editorial knobs. |

## 3. How the change is measured

`getTrend()` already returns every daily snapshot oldest-first
(`{ date, censorshipPct }`). The verdict is derived purely from that array — **no
new query**.

Let `latest` be the most recent date in the trend.

- **`nowAvg`** = mean `censorshipPct` over dates in `[latest − 6d, latest]`
  (the trailing 7-day window).
- **`agoAvg`** = mean `censorshipPct` over dates in `[latest − 36d, latest − 30d]`
  (the 7-day window ending 30 days before `latest`).
- **`changePct`** = `agoAvg === 0 ? 0 : (nowAvg − agoAvg) / agoAvg × 100`.

Date selection uses real calendar arithmetic on the ISO date strings (not array
index offsets), so gaps in the daily series degrade gracefully.

**Fallback (short history).** If the `agoAvg` window contains no points — fewer
than ~37 days of data exist — `agoAvg` falls back to the **oldest point** in the
trend. If the trend has 0 or 1 points, `changePct` is `0`.

## 4. The four states & thresholds

Two constants in `hero-verdict.ts`:

```ts
const FLAT_BAND = 10;   // relative %, the "no real movement" half-width
const LEVEL_LINE = 50;  // censorship %, the resistance-strong / taking-over split
```

Classification — `changePct` (signed) and `current` (the latest **single day's**
`censorshipPct`, i.e. the number the Hero displays):

| Condition | State | Headline word | Tone | Arrow |
|---|---|---|---|---|
| `changePct ≤ −FLAT_BAND` | `falling` | `FALLING` | good | `▼` |
| `changePct ≥ +FLAT_BAND` | `rising` | `RISING` | bad | `▲` |
| `|changePct| < FLAT_BAND` and `current < LEVEL_LINE` | `contained` | `CONTAINED` | good | `▬` |
| `|changePct| < FLAT_BAND` and `current ≥ LEVEL_LINE` | `winning` | `WINNING` | bad | `▬` |

Boundaries are explicit: `−10` → `falling`, `+10` → `rising`, `current` of
exactly `50` → `winning`.

**Why the level check uses `current`, not `nowAvg`:** the Hero renders `current`
as the big number. Classifying the level off the *same* value the visitor sees
guarantees the number and the message can never visually contradict each other.
Direction (`changePct`) stays smoothed, since that is where single-day noise
actually hurts.

*With today's data — `current` 33.4%, smoothed `changePct` ≈ +6.7% — the verdict
is `contained`: "censorship resistance remains strong."*

## 5. Copy

`changePct` is shown as a whole number (`Math.round` of its absolute value).

| State | Headline | Message |
|---|---|---|
| `falling` | `CENSORSHIP IS FALLING` | `Down {abs}% over the last 30 days — censorship resistance is gaining ground.` |
| `rising` | `CENSORSHIP IS RISING` | `Up {abs}% over the last 30 days — censorship is regaining its grip.` |
| `contained` | `CENSORSHIP IS CONTAINED` | `Barely moved in a month — censorship resistance remains strong.` |
| `winning` | `CENSORSHIP IS WINNING` | `Barely moved in a month — censorship is taking over.` |

## 6. Architecture — `src/lib/hero-verdict.ts` (new)

A single pure module: the threshold constants, the smoothing math, the
classifier, and the copy table. No DB import — it takes the already-fetched
trend array, so it is fully unit-testable.

```ts
import type { TrendPoint } from "./queries";

export type HeroState = "falling" | "rising" | "contained" | "winning";

export interface HeroVerdict {
  state: HeroState;
  headlineWord: string;          // "FALLING" | "RISING" | "CONTAINED" | "WINNING"
  tone: "good" | "bad";          // drives the Hero's colour / glow / wash
  arrow: string;                 // "▼" | "▲" | "▬"
  current: number;               // latest day's censorship % — the big number
  changePct: number;             // signed relative % over 30 days (0 if not derivable)
  message: string;               // the preset sentence, numbers interpolated
}

export function computeHeroVerdict(trend: TrendPoint[]): HeroVerdict;
```

`tone` maps directly: `falling`/`contained` → `good`, `rising`/`winning` → `bad`.

**Empty trend.** `computeHeroVerdict([])` returns a safe default rather than
throwing: `state: "contained"`, `current: 0`, `changePct: 0`, the `contained`
copy. In practice the homepage never calls it with an empty trend (see §8), but
keeping the function total simplifies tests and callers.

## 7. Hero component — `src/components/sections/hero.tsx`

`HeroProps` changes from `{ summary: StatsSummary }` to `{ verdict: HeroVerdict }`.
The peak-comparison block (`drop`, `isFalling`, `trendWord`, `trendColor`,
`trendGlow`) is deleted and replaced by reads off `verdict`:

- **Verdict wash + headline glow** — keyed off `verdict.tone === "good"`
  (`var(--good)` vs. `var(--warn)`; `text-good`/`glow-good` vs.
  `text-warn`/`glow-warn`). Same visual system, new input.
- **Headline third line** — `verdict.headlineWord` (four words instead of two).
- **Stat line** — the big `CountUp` renders `verdict.current`; the arrow is
  `verdict.arrow`, coloured `text-good`/`text-warn` by tone; the descriptive
  text is `verdict.message` (replacing "down X pts from a Y peak").

No structural/layout change — the existing markup, animations, and the terminal
lede box are untouched.

## 8. Wiring — `src/app/page.tsx`

`trend` is already fetched in the `Promise.all`. After the existing
`if (!latest || !summary)` guard (which only passes when the trend is
non-empty), compute the verdict and pass it down:

```ts
const verdict = computeHeroVerdict(trend);
...
<Hero verdict={verdict} />
```

`getStatsSummary` / `summary` stay — `TrendChart` still consumes them. Only the
Hero stops depending on `summary`.

## 9. Error handling & edge cases

| Situation | Behaviour |
|---|---|
| Fewer than ~37 days of data | `agoAvg` falls back to the oldest trend point (§3). |
| 0–1 trend points | `changePct` = 0 → `flat`; level decides `contained`/`winning`. |
| `agoAvg` computes to 0 | Division guarded → `changePct` = 0. |
| Empty trend passed directly | Safe default verdict (§6). |
| Gaps in the daily series | Calendar-date window selection averages whatever points fall inside; no crash. |

## 10. Testing — `src/lib/hero-verdict.test.ts` (new)

Pure-function tests over synthetic `TrendPoint[]` fixtures:

- One test per state: clear fall, clear rise, flat-and-low (`contained`),
  flat-and-high (`winning`).
- Threshold boundaries: `changePct` exactly `−10` / `+10`; `current` exactly
  `50`; a value just inside the flat band.
- Smoothing: a fixture where single-day endpoints would misclassify but the
  7-day averages classify correctly.
- Fallback: a <37-day series uses the oldest point; a single-point series; an
  empty series.
- `agoAvg`-zero division guard.
- Message interpolation: correct sign word and rounded absolute value.

`hero.tsx` has no existing unit test and stays presentational; it is covered by
the e2e suite, which already asserts the homepage renders. No e2e change needed
(the Hero still renders a headline and a stat line).

## 11. Out of scope

- Changing the **StatusBar** strip — it keeps showing the latest censorship %.
- Configurable lookback windows other than 30 days.
- A fifth "holding steady (mid-level)" state — the 50% line splits flat cleanly
  into two; revisit only if the binary proves too coarse.
- Surfacing the 30-day change anywhere else (API, Trend Chart, embed).

## 12. Build sequence

1. `src/lib/hero-verdict.ts` — constants, smoothing, classifier, copy table
   (TDD against `hero-verdict.test.ts`).
2. Refactor `hero.tsx` to the `verdict` prop; delete the peak-comparison logic.
3. Wire `computeHeroVerdict(trend)` into `page.tsx`.
4. `pnpm lint`, `pnpm test`, `pnpm test:e2e`; manual check of the homepage.
