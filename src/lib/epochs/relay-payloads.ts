import { z } from "zod";
import { RELAYS } from "@/config/relays";

/** One delivered MEV-boost payload, normalised and tagged with its relay. */
export interface DeliveredPayload {
  slot: number;
  blockHash: string;
  builderPubkey: string;
  valueWei: string;
  numTx: number;
  blockNumber: number;
  relayId: string;
}

/** The combined result of querying every relay's data API. */
export interface RelayDeliveriesResult {
  payloads: DeliveredPayload[];
  okRelays: string[];
  failedRelays: string[];
}

/** Anything that can supply recent relay deliveries (real or a test fake). */
export interface PayloadSource {
  fetchRecentDeliveries(): Promise<RelayDeliveriesResult>;
}

const DeliveredPayloadSchema = z.object({
  slot: z.coerce.number(),
  block_hash: z.string(),
  builder_pubkey: z.string(),
  value: z.string(),
  num_tx: z.coerce.number(),
  block_number: z.coerce.number(),
});
const ResponseSchema = z.array(DeliveredPayloadSchema);

// bloXroute caps limit at 100; >100 returns HTTP 400. Other relays accept
// 200+, but 100 is the safe common max — keeps every relay healthy without
// silently dropping the censoring side (see spec §6).
const ENDPOINT =
  "/relay/v1/data/bidtraces/proposer_payload_delivered?limit=100";
const TIMEOUT_MS = 4000;

/** Fetches recent delivered payloads from every configured relay's data API. */
export class RelayPayloadSource implements PayloadSource {
  readonly name = "mev-boost relay data API";

  /**
   * @param revalidateSeconds Next.js data-cache TTL for each relay fetch.
   *   The /api/epochs route uses the short default; the homepage server
   *   render passes a long value so the relay fetch does not drag the
   *   page's ISR revalidate window down.
   */
  constructor(private readonly revalidateSeconds: number = 15) {}

  async fetchRecentDeliveries(): Promise<RelayDeliveriesResult> {
    const settled = await Promise.allSettled(
      RELAYS.map((relay) => this.fetchOne(relay.dataApiHost, relay.id)),
    );

    const payloads: DeliveredPayload[] = [];
    const okRelays: string[] = [];
    const failedRelays: string[] = [];

    settled.forEach((result, i) => {
      const relay = RELAYS[i];
      if (result.status === "fulfilled") {
        payloads.push(...result.value);
        okRelays.push(relay.id);
      } else {
        failedRelays.push(relay.id);
        const reason = result.reason;
        // Expected 4s AbortController timeouts fire on every poll for any
        // chronically slow relay — warning here would drown new failures (e.g.
        // a fresh bloXroute HTTP 400) under repeating AbortError noise.
        const isTimeout = reason instanceof Error && reason.name === "AbortError";
        if (!isTimeout) {
          console.warn(`relay-payloads: ${relay.id} failed`, {
            relayId: relay.id,
            host: relay.dataApiHost,
            errorClass:
              reason instanceof Error ? reason.constructor.name : typeof reason,
            message: reason instanceof Error ? reason.message : String(reason),
          });
        }
      }
    });

    return { payloads, okRelays, failedRelays };
  }

  private async fetchOne(
    host: string,
    relayId: string,
  ): Promise<DeliveredPayload[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`https://${host}${ENDPOINT}`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
        next: { revalidate: this.revalidateSeconds },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = ResponseSchema.parse(await res.json());
      return parsed.map((p) => ({
        slot: p.slot,
        blockHash: p.block_hash,
        builderPubkey: p.builder_pubkey,
        valueWei: p.value,
        numTx: p.num_tx,
        blockNumber: p.block_number,
        relayId,
      }));
    } finally {
      clearTimeout(timer);
    }
  }
}
