import { z } from "zod";

import { RELAYS, type RelayInfo } from "@/config/relays";

import type { RelayPayload } from "./types";

// 100 is the strictest cap among active relays — bloXroute (Max Profit and
// Regulated) reject anything higher with HTTP 400 "maximum limit is 100",
// which would otherwise degrade ~30% of mainnet share. At our 10s poll
// interval, 100 payloads covers >30 min for the busiest relay — well past
// the 25.6 min window we render.
const DEFAULT_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 4_000;

const RelayPayloadResponseSchema = z.array(
  z.object({
    slot: z.coerce.number().int().nonnegative(),
    block_hash: z.string(),
    builder_pubkey: z.string().optional(),
    value: z.string().optional(),
    num_tx: z.coerce.number().int().nonnegative().optional(),
    block_number: z.coerce.number().int().nonnegative(),
  }),
);

export interface FetchRelayPayloadsOptions {
  relays?: RelayInfo[];
  limit?: number;
  timeoutMs?: number;
}

export interface FetchRelayPayloadsResult {
  payloads: RelayPayload[];
  degradedRelays: string[];
  successfulRelays: string[];
}

export async function fetchRelayPayloads(
  opts: FetchRelayPayloadsOptions = {},
): Promise<FetchRelayPayloadsResult> {
  const relays = opts.relays ?? RELAYS;
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const results = await Promise.all(
    relays.map((relay) => fetchOneRelay(relay, limit, timeoutMs)),
  );

  return {
    payloads: results.flatMap((result) => result.payloads),
    degradedRelays: results
      .filter((result) => !result.ok)
      .map((result) => result.relayId),
    successfulRelays: results
      .filter((result) => result.ok)
      .map((result) => result.relayId),
  };
}

async function fetchOneRelay(
  relay: RelayInfo,
  limit: number,
  timeoutMs: number,
): Promise<
  | { ok: true; relayId: string; payloads: RelayPayload[] }
  | { ok: false; relayId: string; payloads: [] }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://${relay.dataApiHost}/relay/v1/data/bidtraces/proposer_payload_delivered?limit=${limit}`,
      { signal: controller.signal },
    );
    if (!response.ok) return { ok: false, relayId: relay.id, payloads: [] };

    const parsed = RelayPayloadResponseSchema.parse(await response.json());
    return {
      ok: true,
      relayId: relay.id,
      payloads: parsed.map((payload) => ({
        relayId: relay.id,
        slot: payload.slot,
        blockNumber: payload.block_number,
        blockHash: payload.block_hash,
        builderPubkey: payload.builder_pubkey,
        valueWei: payload.value,
        numTx: payload.num_tx,
      })),
    };
  } catch {
    return { ok: false, relayId: relay.id, payloads: [] };
  } finally {
    clearTimeout(timeout);
  }
}
