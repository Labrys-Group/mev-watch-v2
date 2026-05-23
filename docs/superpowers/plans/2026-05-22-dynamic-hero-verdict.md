# Dynamic 30-Day Hero Verdict Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage Hero's all-time-peak comparison with a dynamic month-over-month verdict — a four-state headline word and preset message driven by the smoothed 30-day censorship change.

**Architecture:** A new pure module `src/lib/hero-verdict.ts` takes the already-fetched daily trend array, computes a smoothed 30-day relative change, and classifies it into one of four states (`falling`/`rising`/`contained`/`winning`) with copy. `page.tsx` computes the verdict and passes it to a `Hero` component that loses its peak-comparison logic.

**Tech Stack:** Next.js 16 App Router, TypeScript, React server components, Vitest, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-05-22-dynamic-hero-verdict-design.md`

---

## File Structure

- **Create** `src/lib/hero-verdict.ts` — threshold constants, smoothing math, classifier, copy table. One responsibility: turn a trend array into a `HeroVerdict`. No DB import.
- **Create** `src/lib/hero-verdict.test.ts` — unit tests for the classifier.
- **Modify** `src/components/sections/hero.tsx` — swap the `summary` prop for a `verdict` prop; delete peak-comparison logic.
- **Modify** `src/app/page.tsx` — compute the verdict from the already-fetched `trend` and pass it to `<Hero>`.

---

## Task 1: The 30-day Hero verdict classifier

**Files:**
- Create: `src/lib/hero-verdict.ts`
- Test: `src/lib/hero-verdict.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/hero-verdict.test.ts` with this exact content:

```ts
import { describe, it, expect } from "vitest";
import { computeHeroVerdict } from "./hero-verdict";
import type { TrendPoint } from "./queries";

const END = "2026-05-21";

/** Build a contiguous daily series, oldest first, last point dated `endDate`. */
function series(values: number[], endDate = END): TrendPoint[] {
  return values.map((censorshipPct, i) => {
    const d = new Date(`${endDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (values.length - 1 - i));
    return { date: d.toISOString().slice(0, 10), censorshipPct };
  });
}

/** 37-day series: first 7 days at `ago`, last 7 at `now`, the rest at `mid`. */
function span(ago: number, now: number, mid = 40): TrendPoint[] {
  const values = Array.from({ length: 37 }, (_, i) =>
    i < 7 ? ago : i >= 30 ? now : mid,
  );
  return series(values);
}

describe("computeHeroVerdict", () => {
  it("classifies a clear 30-day fall as falling", () => {
    const v = computeHeroVerdict(span(50, 30));
    expect(v.state).toBe("falling");
    expect(v.headlineWord).toBe("FALLING");
    expect(v.tone).toBe("good");
    expect(v.arrow).toBe("▼");
    expect(Math.round(v.changePct)).toBe(-40);
  });

  it("classifies a clear 30-day rise as rising", () => {
    const v = computeHeroVerdict(span(30, 45));
    expect(v.state).toBe("rising");
    expect(v.headlineWord).toBe("RISING");
    expect(v.tone).toBe("bad");
    expect(v.arrow).toBe("▲");
  });

  it("classifies a flat trend below the level line as contained", () => {
    const v = computeHeroVerdict(span(33, 34));
    expect(v.state).toBe("contained");
    expect(v.headlineWord).toBe("CONTAINED");
    expect(v.tone).toBe("good");
  });

  it("classifies a flat trend at or above the level line as winning", () => {
    const v = computeHeroVerdict(span(54, 55));
    expect(v.state).toBe("winning");
    expect(v.headlineWord).toBe("WINNING");
    expect(v.tone).toBe("bad");
  });

  it("treats exactly -10% as falling (lower flat-band boundary)", () => {
    expect(computeHeroVerdict(span(50, 45)).state).toBe("falling");
  });

  it("treats exactly +10% as rising (upper flat-band boundary)", () => {
    expect(computeHeroVerdict(span(50, 55)).state).toBe("rising");
  });

  it("keeps a -9% change inside the flat band", () => {
    expect(computeHeroVerdict(span(40, 36.4)).state).toBe("contained");
  });

  it("treats current of exactly 50% as winning", () => {
    const v = computeHeroVerdict(span(49.6, 50));
    expect(v.current).toBe(50);
    expect(v.state).toBe("winning");
  });

  it("treats current just under 50% as contained", () => {
    expect(computeHeroVerdict(span(49.6, 49.9)).state).toBe("contained");
  });

  it("smooths single-day spikes — a one-day jump stays flat", () => {
    const values = Array.from({ length: 37 }, () => 30);
    values[36] = 48;
    // Point-to-point (48 vs 30) would be +60% → rising; smoothed it is ~+9% → flat.
    expect(computeHeroVerdict(series(values)).state).toBe("contained");
  });

  it("falls back to the oldest point when 30-day history is missing", () => {
    const v = computeHeroVerdict(series([40, 40, 40, 40, 40, 30, 30, 30, 30, 30]));
    expect(v.state).toBe("falling");
  });

  it("returns a flat verdict for a single data point", () => {
    const v = computeHeroVerdict(series([33]));
    expect(v.state).toBe("contained");
    expect(v.changePct).toBe(0);
  });

  it("returns a safe default for an empty trend", () => {
    const v = computeHeroVerdict([]);
    expect(v.state).toBe("contained");
    expect(v.current).toBe(0);
    expect(v.changePct).toBe(0);
  });

  it("guards against division by a zero baseline", () => {
    const v = computeHeroVerdict(span(0, 5));
    expect(v.changePct).toBe(0);
    expect(v.state).toBe("contained");
  });

  it("interpolates the rounded change into the falling message", () => {
    expect(computeHeroVerdict(span(50, 30)).message).toBe(
      "Down 40% over the last 30 days — censorship resistance is gaining ground.",
    );
  });

  it("interpolates the rounded change into the rising message", () => {
    expect(computeHeroVerdict(span(30, 45)).message).toBe(
      "Up 50% over the last 30 days — censorship is regaining its grip.",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/hero-verdict.test.ts`
Expected: FAIL — cannot resolve `./hero-verdict` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/hero-verdict.ts` with this exact content:

```ts
// Relative import (not "@/lib/queries"): keeps this module resolvable from
// tsx scripts, matching the convention used elsewhere under src/lib.
import type { TrendPoint } from "./queries";

/** Relative-% change within ±this band reads as "no real movement". */
const FLAT_BAND = 10;
/** Censorship % at or above which a flat trend reads as "winning". */
const LEVEL_LINE = 50;
/** Days averaged at each endpoint to smooth single-day noise. */
const SMOOTH_DAYS = 7;
/** Month-over-month lookback. */
const LOOKBACK_DAYS = 30;

export type HeroState = "falling" | "rising" | "contained" | "winning";

export interface HeroVerdict {
  /** Classified trend state. */
  state: HeroState;
  /** Word completing "CENSORSHIP IS ___". */
  headlineWord: string;
  /** Drives the Hero's colour, glow, and verdict wash. */
  tone: "good" | "bad";
  /** Directional glyph for the stat line. */
  arrow: string;
  /** Latest day's censorship % — the big number the Hero shows. */
  current: number;
  /** Signed relative % change over the last 30 days (0 if not derivable). */
  changePct: number;
  /** Preset sentence, numbers interpolated. */
  message: string;
}

const COPY: Record<HeroState, Pick<HeroVerdict, "headlineWord" | "tone" | "arrow">> = {
  falling: { headlineWord: "FALLING", tone: "good", arrow: "▼" },
  rising: { headlineWord: "RISING", tone: "bad", arrow: "▲" },
  contained: { headlineWord: "CONTAINED", tone: "good", arrow: "▬" },
  winning: { headlineWord: "WINNING", tone: "bad", arrow: "▬" },
};

/** Add `days` (may be negative) to an ISO `YYYY-MM-DD` date. */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Mean censorshipPct of points whose date falls within [from, to] inclusive. */
function meanInRange(trend: TrendPoint[], from: string, to: string): number | null {
  const inRange = trend.filter((p) => p.date >= from && p.date <= to);
  if (inRange.length === 0) return null;
  return inRange.reduce((sum, p) => sum + p.censorshipPct, 0) / inRange.length;
}

/** Preset copy for a state, with the rounded change interpolated. */
function messageFor(state: HeroState, changePct: number): string {
  const abs = Math.round(Math.abs(changePct));
  const messages: Record<HeroState, string> = {
    falling: `Down ${abs}% over the last 30 days — censorship resistance is gaining ground.`,
    rising: `Up ${abs}% over the last 30 days — censorship is regaining its grip.`,
    contained: "Barely moved in a month — censorship resistance remains strong.",
    winning: "Barely moved in a month — censorship is taking over.",
  };
  return messages[state];
}

function build(state: HeroState, current: number, changePct: number): HeroVerdict {
  return {
    state,
    ...COPY[state],
    current,
    changePct,
    message: messageFor(state, changePct),
  };
}

/**
 * Classify the censorship trend over the last 30 days into a Hero verdict.
 *
 * Direction is measured from smoothed 7-day endpoint averages — single days are
 * too noisy. The resistance-strong / taking-over split uses the latest single
 * day (the number the Hero displays), so the figure and the message can never
 * visually contradict each other.
 */
export function computeHeroVerdict(trend: TrendPoint[]): HeroVerdict {
  if (trend.length === 0) return build("contained", 0, 0);

  const latest = trend[trend.length - 1];
  const current = latest.censorshipPct;

  const nowAvg =
    meanInRange(trend, addDays(latest.date, -(SMOOTH_DAYS - 1)), latest.date) ??
    current;

  const agoAvg =
    meanInRange(
      trend,
      addDays(latest.date, -(LOOKBACK_DAYS + SMOOTH_DAYS - 1)),
      addDays(latest.date, -LOOKBACK_DAYS),
    ) ?? trend[0].censorshipPct;

  const changePct = agoAvg === 0 ? 0 : ((nowAvg - agoAvg) / agoAvg) * 100;

  let state: HeroState;
  if (changePct <= -FLAT_BAND) state = "falling";
  else if (changePct >= FLAT_BAND) state = "rising";
  else if (current < LEVEL_LINE) state = "contained";
  else state = "winning";

  return build(state, current, changePct);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/hero-verdict.test.ts`
Expected: PASS — all 16 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hero-verdict.ts src/lib/hero-verdict.test.ts
git commit -m "feat: add the 30-day Hero verdict classifier"
```

---

## Task 2: Drive the Hero from the verdict

The `Hero` prop change and the `page.tsx` wiring must land together — changing one without the other breaks the type-check. Both files are in this single task.

**Files:**
- Modify: `src/components/sections/hero.tsx` (full rewrite)
- Modify: `src/app/page.tsx` (three edits)

- [ ] **Step 1: Rewrite `src/components/sections/hero.tsx`**

Replace the entire file with this exact content:

```tsx
import { CountUp } from "@/components/count-up";
import type { CSSVars } from "@/lib/css";
import type { HeroVerdict } from "@/lib/hero-verdict";

interface HeroProps {
  verdict: HeroVerdict;
}

export function Hero({ verdict }: HeroProps) {
  const isGood = verdict.tone === "good";
  const trendWord = verdict.headlineWord;
  const trendColor = isGood ? "text-good" : "text-warn";
  const trendGlow = isGood ? "glow-good" : "glow-warn";

  return (
    <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8">
      {/* Verdict-tinted wash — a faint colour cue for the current trend */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 125% at 0% 0%, color-mix(in oklch, ${
            isGood ? "var(--good)" : "var(--warn)"
          } 14%, transparent) 0%, transparent 58%)`,
        }}
      />
      {/* Faded grid background texture */}
      <div aria-hidden="true" className="faded-grid pointer-events-none absolute inset-0" />

      {/* Hero content — layered above grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-end">
        {/* Left column — headline & stat */}
        <div>
          {/* Tag line */}
          <div
            className="anim-fade-up inline-flex items-center gap-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-accent-brand mb-4"
            style={{ "--delay": "80ms" } as CSSVars}
          >
            <span aria-hidden="true">{"// "}</span>
            PUBLIC TRANSPARENCY TOOL
          </div>

          {/* Display headline — masked line-by-line rise */}
          <h1
            className="font-sans font-extrabold leading-[0.95] tracking-[-0.035em] m-0 text-foreground"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
          >
            <span className="line-mask block">
              <span className="line-rise" style={{ "--delay": "160ms" } as CSSVars}>
                CENSORSHIP
              </span>
            </span>
            <span className="line-mask block">
              <span className="line-rise" style={{ "--delay": "260ms" } as CSSVars}>
                IS
              </span>
            </span>
            <span className="line-mask block">
              <span
                className={`line-rise ${trendColor} ${trendGlow}`}
                style={{ "--delay": "360ms" } as CSSVars}
              >
                {trendWord}
              </span>
            </span>
          </h1>

          {/* Stat line — latest figure, trend arrow, preset verdict message */}
          <div
            className="anim-fade-up mt-5 font-mono text-[13px] tracking-[0.04em] leading-snug text-fg-muted"
            style={{ "--delay": "540ms" } as CSSVars}
          >
            <span
              className="font-sans font-extrabold tracking-tight text-foreground"
              style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.1rem)" }}
            >
              <CountUp value={verdict.current} decimals={1} suffix="%" />
            </span>{" "}
            <span className={`${trendColor} font-semibold`}>{verdict.arrow}</span>{" "}
            <span>{verdict.message}</span>
          </div>
        </div>

        {/* Right column — terminal lede box */}
        <div
          className="anim-fade-up relative font-mono text-[12.5px] leading-[1.65] text-fg-muted max-w-sm lg:max-w-none p-4 border border-border-labrys bg-panel"
          style={{ "--delay": "660ms" } as CSSVars}
        >
          {/* $ cat ./readme.md label */}
          <span
            className="absolute -top-[9px] left-3.5 px-2 bg-background font-mono text-[10px] tracking-[0.1em] text-accent-brand"
            aria-hidden="true"
          >
            $ cat ./readme.md
          </span>

          <p className="m-0">
            Some MEV-Boost relays filter OFAC-sanctioned transactions.{" "}
            <strong className="text-foreground font-semibold">
              MEV Watch tracks how much of Ethereum&apos;s block flow still passes
              through them
            </strong>{" "}
            — and shows that share falling over time.
            <span
              aria-hidden="true"
              className="cursor-blink ml-1 inline-block h-[1.05em] w-[7px] translate-y-[0.2em] bg-accent-brand align-baseline"
            />
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add the `hero-verdict` import to `src/app/page.tsx`**

Find this line (end of the `@/lib/queries` import block, around line 19):

```tsx
} from "@/lib/queries";
```

Replace it with:

```tsx
} from "@/lib/queries";
import { computeHeroVerdict } from "@/lib/hero-verdict";
```

- [ ] **Step 3: Compute the verdict and pass it to `<Hero>` in `src/app/page.tsx`**

Find this block (the no-data guard's closing brace through the start of the render):

```tsx
  }

  return (
    <div className="min-h-screen">
```

Replace it with:

```tsx
  }

  const verdict = computeHeroVerdict(trend);

  return (
    <div className="min-h-screen">
```

Then find:

```tsx
          <Hero summary={summary} />
```

Replace it with:

```tsx
          <Hero verdict={verdict} />
```

(`summary` is still consumed by `<TrendChart>`, so its query and variable stay.)

- [ ] **Step 4: Run the linter**

Run: `pnpm lint`
Expected: PASS — no errors. (If it flags an unused `formatPercent` or `StatsSummary`, confirm both were removed from `hero.tsx`'s imports in Step 1 — they were.)

- [ ] **Step 5: Run the production build (type-check)**

Run: `pnpm build`
Expected: PASS — compiles with no TypeScript errors. This confirms the `verdict` prop type flows correctly from `page.tsx` into `Hero`.

- [ ] **Step 6: Run the full unit and e2e suites**

Run: `pnpm test`
Expected: PASS — all suites, including `hero-verdict.test.ts`.

Run: `pnpm test:e2e`
Expected: PASS — the homepage e2e (`e2e/home.spec.ts`) still finds a percentage on the page; no e2e asserts the Hero's specific wording.

- [ ] **Step 7: Manual check**

Run: `pnpm dev`, open http://localhost:3000.
Expected: the Hero headline reads `CENSORSHIP IS CONTAINED` (with current data: ~33% and a small 30-day change), the third line is mint-coloured, and the stat line shows `33.4% ▬ Barely moved in a month — censorship resistance remains strong.`

- [ ] **Step 8: Commit**

```bash
git add src/components/sections/hero.tsx src/app/page.tsx
git commit -m "feat: drive the Hero headline from the 30-day verdict"
```

---

## Self-Review

**Spec coverage:**
- §2 decisions (Hero target, 30-day, relative %, 7-day smoothing, ±10% / 50%) → encoded as constants in Task 1, Step 3.
- §3 smoothing + fallback → `meanInRange`, `addDays`, the `?? trend[0]` fallback; tested in Task 1 ("falls back...", "single data point").
- §4 four states + boundaries → the classifier `if/else` chain; tested at `-10`, `+10`, `current = 50`.
- §5 copy → `COPY` table + `messageFor`; tested for interpolation.
- §6 `HeroVerdict` interface + empty-trend default → defined and tested.
- §7 Hero refactor → Task 2, Step 1.
- §8 `page.tsx` wiring → Task 2, Steps 2–3.
- §9 edge cases → all covered by Task 1 tests (short history, single point, empty, zero baseline).
- §10 testing → `hero-verdict.test.ts`; e2e unchanged, run in Task 2, Step 6.

**Placeholder scan:** none — every step has complete file content or exact find/replace text.

**Type consistency:** `HeroVerdict`, `HeroState`, and `computeHeroVerdict` are named identically across `hero-verdict.ts`, its test, `hero.tsx`, and `page.tsx`. The `verdict` prop name matches between `HeroProps` and the `<Hero verdict={verdict} />` call site.
