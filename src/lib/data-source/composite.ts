import type { DataSource, DayRelayStats } from "./types";

/**
 * Combines two upstreams: one supplies relay data, the other supplies builder
 * data. Used to pair the Dune per-slot relay attribution with relayscan's
 * (already-correct) builder counts. Fail-closed — either child throwing
 * surfaces to the caller.
 */
export class CompositeDataSource implements DataSource {
  readonly name: string;

  constructor(
    private readonly relaysSource: DataSource,
    private readonly buildersSource: DataSource,
  ) {
    this.name = `${relaysSource.name}+${buildersSource.name}`;
  }

  async fetchDay(date: string): Promise<DayRelayStats> {
    const [r, b] = await Promise.all([
      this.relaysSource.fetchDay(date),
      this.buildersSource.fetchDay(date),
    ]);
    return { date, relays: r.relays, builders: b.builders };
  }
}
