import { z } from "zod";
import type { DataSource, DayRelayStats } from "./types";

const RelaySchema = z.object({
  relay: z.string(),
  num_payloads: z.number(),
  percent: z.string(),
});

const BuilderSchema = z.object({
  info: z.object({
    extra_data: z.string(),
    num_blocks: z.number(),
    percent: z.string(),
  }),
});

const DayStatsSchema = z.object({
  date: z.string(),
  relays: z.array(RelaySchema),
  builders: z.array(BuilderSchema),
});

/** The relayscan.io public JSON API. */
export class RelayscanDataSource implements DataSource {
  readonly name = "relayscan.io";

  private readonly baseUrl = "https://www.relayscan.io";

  async fetchDay(date: string): Promise<DayRelayStats> {
    const url = `${this.baseUrl}/stats/day/${date}/json`;

    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `relayscan request failed for ${date}: HTTP ${response.status}`,
      );
    }

    const parsed = DayStatsSchema.parse(await response.json());

    return {
      date: parsed.date,
      relays: parsed.relays.map((r) => ({
        relayId: r.relay,
        numPayloads: r.num_payloads,
      })),
      builders: parsed.builders.map((b) => ({
        builderId: b.info.extra_data,
        numBlocks: b.info.num_blocks,
      })),
    };
  }
}
