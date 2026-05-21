// Relative import (not "@/config/relays"): this module is transitively
// imported by tsx scripts, which do not resolve the @/* path alias.
import { classifyRelay } from "../config/relays";
import type { RelayPayloadCount } from "./data-source/types";

/**
 * Ethereum produces one slot every 12s → 7200 slots per day. Used to estimate
 * the non-MEV-boost share (blocks built locally by validators, which relayscan
 * does not report). This is an approximation, documented on the methodology page.
 */
export const SLOTS_PER_DAY = 7200;

export interface DailyStatsResult {
  censorshipPct: number;
  neutralPct: number;
  nonBoostPct: number;
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

/** Compute the day's censorship composition from relay payload counts. */
export function computeDailyStats(relays: RelayPayloadCount[]): DailyStatsResult {
  const mevBoostTotal = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  let censoring = 0;
  for (const r of relays) {
    if (classifyRelay(r.relayId).posture === "censoring") {
      censoring += r.numPayloads;
    }
  }
  const neutral = mevBoostTotal - censoring;
  const nonBoost = Math.max(0, SLOTS_PER_DAY - mevBoostTotal);
  const totalBlocks = mevBoostTotal + nonBoost;

  const pct = (n: number) => (totalBlocks === 0 ? 0 : (n / totalBlocks) * 100);

  return {
    censorshipPct: pct(censoring),
    neutralPct: pct(neutral),
    nonBoostPct: pct(nonBoost),
    totalBlocks,
  };
}

/** Per-relay breakdown (share of MEV-boost blocks) for the leaderboard. */
export function computeRelayBreakdown(
  relays: RelayPayloadCount[],
): RelayBreakdownEntry[] {
  const mevBoostTotal = relays.reduce((sum, r) => sum + r.numPayloads, 0);

  return relays.map((r) => {
    const info = classifyRelay(r.relayId);
    return {
      relayId: r.relayId,
      name: info.name,
      posture: info.posture,
      blocks: r.numPayloads,
      sharePct: mevBoostTotal === 0 ? 0 : (r.numPayloads / mevBoostTotal) * 100,
      censorshipRate: info.posture === "censoring" ? 100 : 0,
    };
  });
}
