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
  /**
   * Hostname of the relay's standard MEV-boost data API. Used to query
   * `/relay/v1/data/bidtraces/proposer_payload_delivered`. Often equal to
   * `id`, but recorded separately because `id` is not always a resolvable host.
   */
  dataApiHost: string;
}

export const RELAYS: RelayInfo[] = [
  { id: "relay.ultrasound.money", name: "Ultra Sound", posture: "neutral", dataApiHost: "relay.ultrasound.money" },
  { id: "titanrelay.xyz", name: "Titan", posture: "neutral", dataApiHost: "titanrelay.xyz" },
  { id: "bloxroute.max-profit.blxrbdn.com", name: "bloXroute Max Profit", posture: "censoring", dataApiHost: "bloxroute.max-profit.blxrbdn.com" },
  { id: "bloxroute.regulated.blxrbdn.com", name: "bloXroute Regulated", posture: "censoring", dataApiHost: "bloxroute.regulated.blxrbdn.com" },
  { id: "aestus.live", name: "Aestus", posture: "neutral", dataApiHost: "mainnet.aestus.live" },
  { id: "boost-relay.flashbots.net", name: "Flashbots", posture: "censoring", dataApiHost: "boost-relay.flashbots.net" },
  { id: "agnostic-relay.net", name: "Agnostic Gnosis", posture: "neutral", dataApiHost: "agnostic-relay.net" },
  { id: "relay.ethgas.com", name: "EthGas", posture: "unknown", dataApiHost: "relay.ethgas.com" },
];

const byId = new Map(RELAYS.map((r) => [r.id, r]));

/**
 * Look up a relay by its relayscan identifier. An unconfigured relay returns a
 * synthetic entry with posture "unknown" so new relays never crash the pipeline.
 */
export function classifyRelay(id: string): RelayInfo {
  return byId.get(id) ?? { id, name: id, posture: "unknown", dataApiHost: id };
}
