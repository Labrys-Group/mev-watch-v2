// Relative import (not "@/config/relays"): this module is transitively
// imported by tsx scripts, which do not resolve the @/* path alias.
import { classifyRelay } from "../config/relays";

export interface RelayPayloadCount {
  relayId: string;
  numPayloads: number;
}

export interface BuilderBlockCount {
  builderId: string;
  numBlocks: number;
}

export interface DailyStatsResult {
  /** Censoring relays' share of all MEV-boost relay payload deliveries (%). */
  censorshipPct: number;
  /** Neutral + unknown relays' share of deliveries (%). */
  neutralPct: number;
  /** Non-MEV-boost (locally built) block share (%), or null when block counts are unavailable. */
  nonBoostPct: number | null;
  /** Total relay payload deliveries counted (a block delivered via N relays
   *  counts N times — relayscan's `num_payloads` is per relay). */
  totalBlocks: number;
}

export interface RelayBreakdownEntry {
  relayId: string;
  name: string;
  posture: string;
  blocks: number;
  sharePct: number;
  /** Posture-derived: 100 for a censoring relay, 0 otherwise. Phase 2 has no
   *  measured per-relay transaction-censorship rate; revisit in a later phase. */
  censorshipRate: number;
}

/**
 * Non-MEV-boost block share (%) — the fraction of all execution-layer blocks
 * that did not come through a relay. Clamped to [0, 100]; day-boundary noise
 * between relayscan's UTC day and execution-block timestamps could otherwise
 * nudge the raw value slightly out of range.
 */
export function nonBoostShare(
  totalChainBlocks: number | null,
  mevBoostBlocks: number,
): number | null {
  if (totalChainBlocks === null) return null;
  if (totalChainBlocks <= 0) return 0;
  const pct = ((totalChainBlocks - mevBoostBlocks) / totalChainBlocks) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Compute the day's censorship metric from relay payload counts, builder block
 * counts, and the total on-chain block count.
 *
 * relayscan reports `num_payloads` per relay; a single block delivered via
 * multiple relays is counted once per relay. We therefore measure censorship as
 * the censoring relays' *share of deliveries* — a ratio in which the multi-relay
 * counting cancels between numerator and denominator. See the methodology page.
 *
 * `date` (ISO `YYYY-MM-DD`) is the day being measured — relays whose OFAC
 * posture changed are classified with the posture in effect on that date.
 *
 * `totalChainBlocks` is the total execution-layer blocks proposed that UTC day;
 * pass null if unavailable (non-boost share will be null).
 */
export function computeDailyStats(
  relays: RelayPayloadCount[],
  builders: BuilderBlockCount[],
  totalChainBlocks: number | null,
  date: string,
): DailyStatsResult {
  const totalDeliveries = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  let censoring = 0;
  for (const r of relays) {
    if (classifyRelay(r.relayId, date).posture === "censoring") {
      censoring += r.numPayloads;
    }
  }

  const censorshipPct =
    totalDeliveries === 0 ? 0 : (censoring / totalDeliveries) * 100;

  const mevBoostBlocks = builders.reduce((sum, b) => sum + b.numBlocks, 0);

  return {
    censorshipPct,
    neutralPct: totalDeliveries === 0 ? 0 : 100 - censorshipPct,
    nonBoostPct: nonBoostShare(totalChainBlocks, mevBoostBlocks),
    totalBlocks: totalDeliveries,
  };
}

/**
 * Per-relay breakdown (share of MEV-boost deliveries) for the leaderboard.
 *
 * `date` (ISO `YYYY-MM-DD`) is the day being measured — see `computeDailyStats`.
 */
export function computeRelayBreakdown(
  relays: RelayPayloadCount[],
  date: string,
): RelayBreakdownEntry[] {
  const totalDeliveries = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  return relays.map((r) => {
    const info = classifyRelay(r.relayId, date);
    return {
      relayId: r.relayId,
      name: info.name,
      posture: info.posture,
      blocks: r.numPayloads,
      sharePct:
        totalDeliveries === 0 ? 0 : (r.numPayloads / totalDeliveries) * 100,
      censorshipRate: info.posture === "censoring" ? 100 : 0,
    };
  });
}

export interface BuilderBreakdownEntry {
  builderId: string;
  blocks: number;
  sharePct: number;
}

/** Per-builder share of MEV-boost blocks for the builder leaderboard. */
export function computeBuilderBreakdown(
  builders: BuilderBlockCount[],
): BuilderBreakdownEntry[] {
  const total = builders.reduce((sum, b) => sum + b.numBlocks, 0);
  return builders.map((b) => ({
    builderId: b.builderId,
    blocks: b.numBlocks,
    sharePct: total === 0 ? 0 : (b.numBlocks / total) * 100,
  }));
}
