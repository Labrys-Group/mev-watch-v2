/** A single relay's payload count for a given day. */
export interface RelayPayloadCount {
  /** Relay identifier as reported by the upstream source. */
  relayId: string;
  /** Number of MEV-boost payloads delivered. */
  numPayloads: number;
}

/** One day of relay statistics from the external source. */
export interface DayRelayStats {
  /** ISO date, e.g. "2026-05-20". */
  date: string;
  relays: RelayPayloadCount[];
}

/**
 * A source of MEV-boost relay statistics. Implementations wrap an external
 * provider (relayscan.io, Dune, ...) so the refresh pipeline stays agnostic.
 */
export interface DataSource {
  /** The provider name, recorded in the refresh audit log. */
  readonly name: string;
  /** Fetch one day of relay stats. Throws on network/parse failure. */
  fetchDay(date: string): Promise<DayRelayStats>;
}
