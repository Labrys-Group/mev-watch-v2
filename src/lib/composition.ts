import type { TrendPoint } from "./queries";

export interface CompositionPoint {
  date: string;
  /** Non-censoring MEV-boost blocks as a share of all chain blocks (%). */
  nonCensored: number;
  /** OFAC-censoring MEV-boost blocks as a share of all chain blocks (%). */
  censored: number;
  /** Non-MEV-boost blocks as a share of all chain blocks (%). */
  nonBoost: number;
  /** Headline metric carried through for the tooltip: censoring share of
   *  MEV-boost blocks (%). */
  censorshipPct: number;
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * Re-base one daily point onto an all-chain-blocks denominator so the three
 * bands stack to 100. `censorshipPct` is the censoring share of MEV-boost;
 * `nonBoostPct` is the non-MEV-boost share of all chain blocks. A point with
 * unavailable non-boost data collapses to the plain censored/non-censored split.
 */
export function toCompositionPoint(point: TrendPoint): CompositionPoint {
  const nonBoost = clamp(point.nonBoostPct ?? 0);
  const boostShare = 100 - nonBoost;
  const censored = clamp((point.censorshipPct * boostShare) / 100);
  const nonCensored = clamp(((100 - point.censorshipPct) * boostShare) / 100);
  return {
    date: point.date,
    nonCensored,
    censored,
    nonBoost,
    censorshipPct: point.censorshipPct,
  };
}
