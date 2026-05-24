/** A single relay's payload count for a given day. */
export interface RelayPayloadCount {
  /** Relay identifier as reported by the upstream source. */
  relayId: string;
  /** Number of MEV-boost payloads delivered. */
  numPayloads: number;
}

/** A single builder's block count for a given day. */
export interface BuilderBlockCount {
  /** Builder identifier (relayscan's `extra_data`). */
  builderId: string;
  numBlocks: number;
}

/** One day of relay statistics from the external source. */
export interface DayRelayStats {
  /** ISO date, e.g. "2026-05-20". */
  date: string;
  relays: RelayPayloadCount[];
  builders: BuilderBlockCount[];
}

/** One day of relay stats plus the day's total on-chain block count. */
export interface DaySnapshot extends DayRelayStats {
  /** Total execution-layer blocks proposed that UTC day. */
  totalChainBlocks: number;
}

/**
 * A source of MEV-boost relay statistics. Implementations wrap an external
 * provider (relayscan.io) so the refresh pipeline stays agnostic.
 */
export interface DataSource {
  /** The provider name, recorded in the refresh audit log. */
  readonly name: string;
  /** Fetch one day of relay stats. Throws on network/parse failure. */
  fetchDay(date: string): Promise<DayRelayStats>;
}

/**
 * A source of total execution-layer block counts, used to derive the
 * non-MEV-boost share. Separate from `DataSource` — a different provider
 * (an Ethereum RPC) answers a different question.
 */
export interface BlockCountSource {
  /** The provider name. */
  readonly name: string;
  /** Total execution-layer blocks proposed during the given UTC date. */
  totalBlocks(date: string): Promise<number>;
}
