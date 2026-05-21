// Relative import (not "@/config/relays"): this module is transitively
// imported by tsx scripts, which do not resolve the @/* path alias.
import { classifyRelay } from "../config/relays";
import type { RelayPayloadCount, BuilderBlockCount } from "./data-source/types";

export interface DailyStatsResult {
  /** Censoring relays' share of all MEV-boost relay payload deliveries (%). */
  censorshipPct: number;
  /** Neutral + unknown relays' share of deliveries (%). */
  neutralPct: number;
  /** Reserved: non-MEV-boost (locally built) block share. Not derivable from
   *  relayscan's aggregate API — always 0 until a per-block source is added. */
  nonBoostPct: number;
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
 * Compute the day's censorship metric from relay payload counts.
 *
 * relayscan reports `num_payloads` per relay; a single block delivered via
 * multiple relays is counted once per relay. We therefore measure censorship as
 * the censoring relays' *share of deliveries* — a ratio in which the multi-relay
 * counting cancels between numerator and denominator. See the methodology page.
 */
export function computeDailyStats(relays: RelayPayloadCount[]): DailyStatsResult {
  const totalDeliveries = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  let censoring = 0;
  for (const r of relays) {
    if (classifyRelay(r.relayId).posture === "censoring") {
      censoring += r.numPayloads;
    }
  }

  const censorshipPct =
    totalDeliveries === 0 ? 0 : (censoring / totalDeliveries) * 100;

  return {
    censorshipPct,
    neutralPct: totalDeliveries === 0 ? 0 : 100 - censorshipPct,
    nonBoostPct: 0,
    totalBlocks: totalDeliveries,
  };
}

/** Per-relay breakdown (share of MEV-boost deliveries) for the leaderboard. */
export function computeRelayBreakdown(
  relays: RelayPayloadCount[],
): RelayBreakdownEntry[] {
  const totalDeliveries = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  return relays.map((r) => {
    const info = classifyRelay(r.relayId);
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
