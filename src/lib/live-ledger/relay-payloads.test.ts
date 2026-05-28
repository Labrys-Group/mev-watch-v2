import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchRelayPayloads } from "./relay-payloads";

const SAMPLE_PAYLOAD = {
  slot: "14382097",
  parent_hash: "0xparent",
  block_hash: "0xblock",
  builder_pubkey: "0xbuilder",
  proposer_pubkey: "0xproposer",
  proposer_fee_recipient: "0xfee",
  gas_limit: "60000000",
  gas_used: "18802227",
  value: "5238498425452159",
  num_tx: "161",
  block_number: "25147170",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchRelayPayloads", () => {
  it("parses payloads and tags them with relay ids", async () => {
    const fetchMock = vi.fn(async () => Response.json([SAMPLE_PAYLOAD]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRelayPayloads({
      relays: [
        {
          id: "relay.ultrasound.money",
          name: "Ultra Sound",
          posture: "neutral",
          dataApiHost: "relay.ultrasound.money",
        },
      ],
      timeoutMs: 1000,
    });

    expect(result.degradedRelays).toEqual([]);
    expect(result.payloads).toEqual([
      {
        relayId: "relay.ultrasound.money",
        slot: 14382097,
        blockNumber: 25147170,
        blockHash: "0xblock",
        builderPubkey: "0xbuilder",
        valueWei: "5238498425452159",
        numTx: 161,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://relay.ultrasound.money/relay/v1/data/bidtraces/proposer_payload_delivered?limit=100",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("keeps successful relays when another relay fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json([SAMPLE_PAYLOAD]))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRelayPayloads({
      relays: [
        {
          id: "ok-relay.example",
          name: "OK",
          posture: "neutral",
          dataApiHost: "ok-relay.example",
        },
        {
          id: "bad-relay.example",
          name: "Bad",
          posture: "censoring",
          dataApiHost: "bad-relay.example",
        },
      ],
      timeoutMs: 1000,
    });

    expect(result.payloads).toHaveLength(1);
    expect(result.degradedRelays).toEqual(["bad-relay.example"]);
  });
});
