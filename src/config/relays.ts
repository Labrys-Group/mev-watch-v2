/**
 * Editorial OFAC-censorship classification of MEV-boost relays.
 *
 * relayscan.io reports each relay's market share, but whether a relay filters
 * OFAC-sanctioned transactions is an editorial judgement — so it is maintained
 * here by hand. Postures are sourced from the ethstaker MEV relay list, relay
 * operator statements, and the Lido Relay Maintenance Committee.
 *
 * A relay's posture can change over time (see `priorPostures`). Historical
 * snapshots must therefore be classified with `classifyRelay(id, date)` so each
 * day is measured against the posture that was actually in effect.
 *
 * Review when relays are added or change posture.
 */

export type RelayPosture = "censoring" | "neutral" | "unknown";

/**
 * A posture that applied before a relay's posture changed. `since` is the ISO
 * date the *next* posture took effect; this entry covers all dates before it.
 */
export interface PriorPosture {
  since: string;
  posture: RelayPosture;
}

/** Editorial classification — carried by every relay, active or decommissioned. */
export interface RelayClassification {
  /** Identifier exactly as reported by relayscan.io's API (`relay` field). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** OFAC-censorship posture as of the most recent data. */
  posture: RelayPosture;
  /**
   * Optional posture history, oldest first, for relays whose OFAC stance
   * changed. Each entry is the posture in effect *before* its `since` date.
   */
  priorPostures?: PriorPosture[];
}

/** An active relay — additionally exposes a live MEV-boost data API. */
export interface RelayInfo extends RelayClassification {
  /**
   * Hostname of the relay's standard MEV-boost data API. Used to query
   * `/relay/v1/data/bidtraces/proposer_payload_delivered`. Often equal to
   * `id`, but recorded separately because `id` is not always a resolvable host.
   */
  dataApiHost: string;
}

/**
 * Active relays — polled live by the epoch ledger and shown in the explorer.
 * Keep this list to relays with a working data API.
 */
export const RELAYS: RelayInfo[] = [
  { id: "relay.ultrasound.money", name: "Ultra Sound", posture: "neutral", dataApiHost: "relay.ultrasound.money" },
  { id: "titanrelay.xyz", name: "Titan", posture: "neutral", dataApiHost: "titanrelay.xyz" },
  {
    id: "bloxroute.max-profit.blxrbdn.com",
    name: "bloXroute Max Profit",
    // Non-censoring until bloXroute's 2023-12-18 announcement that *all* its
    // relays would reject blocks containing OFAC transactions.
    posture: "censoring",
    priorPostures: [{ since: "2023-12-18", posture: "neutral" }],
    dataApiHost: "bloxroute.max-profit.blxrbdn.com",
  },
  { id: "bloxroute.regulated.blxrbdn.com", name: "bloXroute Regulated", posture: "censoring", dataApiHost: "bloxroute.regulated.blxrbdn.com" },
  { id: "aestus.live", name: "Aestus", posture: "neutral", dataApiHost: "mainnet.aestus.live" },
  { id: "boost-relay.flashbots.net", name: "Flashbots", posture: "censoring", dataApiHost: "boost-relay.flashbots.net" },
  { id: "agnostic-relay.net", name: "Agnostic Gnosis", posture: "neutral", dataApiHost: "agnostic-relay.net" },
  // No source classifies EthGas's OFAC behaviour either way — keep "unknown".
  { id: "relay.ethgas.com", name: "EthGas", posture: "unknown", dataApiHost: "relay.ethgas.com" },
];

/**
 * Relays no longer active (or too marginal to poll) — needed only to classify
 * relayscan's historical aggregates. Not polled by the live epoch ledger.
 */
export const HISTORICAL_RELAYS: RelayClassification[] = [
  // The "Ethical" relay filtered frontrunning/sandwiching bundles, never OFAC.
  { id: "bloxroute.ethical.blxrbdn.com", name: "bloXroute Ethical", posture: "neutral" },
  { id: "builder-relay-mainnet.blocknative.com", name: "Blocknative", posture: "censoring" },
  { id: "relay.edennetwork.io", name: "Eden Network", posture: "censoring" },
  { id: "mainnet-relay.securerpc.com", name: "Manifold", posture: "neutral" },
  { id: "relayooor.wtf", name: "relayooor", posture: "neutral" },
  // BTCS markets this explicitly as an OFAC-compliant relay; negligible volume.
  { id: "relay.btcs.com", name: "BTCS", posture: "censoring" },
];

const byId = new Map<string, RelayClassification>(
  [...RELAYS, ...HISTORICAL_RELAYS].map((r) => [r.id, r]),
);

/**
 * Look up a relay by its relayscan identifier.
 *
 * Pass `date` (ISO `YYYY-MM-DD`) to classify a historical block: relays whose
 * posture changed are returned with the posture in effect on that date. Without
 * `date`, the current posture is used.
 *
 * An unconfigured relay returns a synthetic entry with posture "unknown" so new
 * relays never crash the pipeline.
 */
export function classifyRelay(id: string, date?: string): RelayClassification {
  const relay = byId.get(id);
  if (!relay) return { id, name: id, posture: "unknown" };

  if (date && relay.priorPostures) {
    for (const prior of relay.priorPostures) {
      if (date < prior.since) return { ...relay, posture: prior.posture };
    }
  }
  return relay;
}
