/**
 * Editorial OFAC-censorship classification of MEV-boost relays.
 *
 * relayscan.io reports each relay's market share, but whether a relay filters
 * OFAC-sanctioned transactions is an editorial judgement — so it is maintained
 * here by hand. Posture sourced from the ethstaker MEV relay list and relay
 * operator statements (as of May 2026). Review when relays are added/changed.
 */

export type RelayPosture = "censoring" | "neutral" | "unknown";

export interface RelayInfo {
  /** Identifier exactly as reported by relayscan.io's API (`relay` field). */
  id: string;
  /** Human-readable display name. */
  name: string;
  posture: RelayPosture;
}

export const RELAYS: RelayInfo[] = [
  { id: "relay.ultrasound.money", name: "Ultra Sound", posture: "neutral" },
  { id: "titanrelay.xyz", name: "Titan", posture: "neutral" },
  { id: "bloxroute.max-profit.blxrbdn.com", name: "bloXroute Max Profit", posture: "censoring" },
  { id: "bloxroute.regulated.blxrbdn.com", name: "bloXroute Regulated", posture: "censoring" },
  { id: "aestus.live", name: "Aestus", posture: "neutral" },
  { id: "boost-relay.flashbots.net", name: "Flashbots", posture: "censoring" },
  { id: "agnostic-relay.net", name: "Agnostic Gnosis", posture: "neutral" },
  { id: "relay.ethgas.com", name: "EthGas", posture: "unknown" },
];

const byId = new Map(RELAYS.map((r) => [r.id, r]));

/**
 * Look up a relay by its relayscan identifier. An unconfigured relay returns a
 * synthetic entry with posture "unknown" so new relays never crash the pipeline.
 */
export function classifyRelay(id: string): RelayInfo {
  return byId.get(id) ?? { id, name: id, posture: "unknown" };
}
