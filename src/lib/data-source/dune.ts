import { z } from "zod";
import type { DataSource, DayRelayStats } from "./types";

const ExecuteResponse = z.object({ execution_id: z.string() });
const StatusResponse = z.object({ state: z.string() });
const ResultsResponse = z.object({
  result: z.object({
    rows: z.array(
      z.object({
        relay: z.string(),
        num_payloads: z.number(),
      }),
    ),
  }),
});

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

/** The Dune Analytics Query API v1. */
export class DuneDataSource implements DataSource {
  readonly name = "dune.com";

  private readonly baseUrl = "https://api.dune.com/api/v1";

  constructor(
    private readonly apiKey: string,
    private readonly queryId: number,
  ) {}

  async fetchDay(date: string): Promise<DayRelayStats> {
    const executionId = await this.execute(date);
    await this.pollUntilComplete(executionId);
    const rows = await this.fetchResults(executionId);

    return {
      date,
      relays: rows.map((r) => ({
        relayId: r.relay,
        numPayloads: r.num_payloads,
      })),
      // Builders come from a different source via the composite; this adapter
      // only owns relay-level data.
      builders: [],
    };
  }

  private async execute(date: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/query/${this.queryId}/execute`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ query_parameters: { date } }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `dune execute failed for ${date}: HTTP ${response.status}`,
      );
    }
    return ExecuteResponse.parse(await response.json()).execution_id;
  }

  private async pollUntilComplete(executionId: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const response = await fetch(
        `${this.baseUrl}/execution/${executionId}/status`,
        { headers: this.headers },
      );
      if (!response.ok) {
        throw new Error(`dune status failed: HTTP ${response.status}`);
      }
      const { state } = StatusResponse.parse(await response.json());
      if (state === "QUERY_STATE_COMPLETED") return;
      if (state === "QUERY_STATE_FAILED") {
        throw new Error(`dune execution ${executionId} reported FAILED`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(
      `dune execution ${executionId} did not complete within ${POLL_TIMEOUT_MS}ms`,
    );
  }

  private async fetchResults(executionId: string) {
    const response = await fetch(
      `${this.baseUrl}/execution/${executionId}/results`,
      { headers: this.headers },
    );
    if (!response.ok) {
      throw new Error(`dune results failed: HTTP ${response.status}`);
    }
    return ResultsResponse.parse(await response.json()).result.rows;
  }

  private get headers(): Record<string, string> {
    return {
      "X-Dune-API-Key": this.apiKey,
      "content-type": "application/json",
      accept: "application/json",
    };
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
