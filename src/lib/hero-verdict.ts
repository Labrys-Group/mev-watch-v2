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
