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

const ENDPOINT =
  "/relay/v1/data/bidtraces/proposer_payload_delivered?limit=200";
const TIMEOUT_MS = 4000;

/** Fetches recent delivered payloads from every configured relay's data API. */
export class RelayPayloadSource implements PayloadSource {
  readonly name = "mev-boost relay data API";

  async fetchRecentDeliveries(): Promise<RelayDeliveriesResult> {
    const settled = await Promise.allSettled(
      RELAYS.map((relay) => this.fetchOne(relay.dataApiHost, relay.id)),
    );

    const payloads: DeliveredPayload[] = [];
    const okRelays: string[] = [];
    const failedRelays: string[] = [];

    settled.forEach((result, i) => {
      const relayId = RELAYS[i].id;
      if (result.status === "fulfilled") {
        payloads.push(...result.value);
        okRelays.push(relayId);
      } else {
        failedRelays.push(relayId);
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
        next: { revalidate: 15 },
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
