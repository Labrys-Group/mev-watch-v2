import { describe, it, expect, vi, afterEach } from "vitest";
import { findBlockAtOrAfter, EthRpcBlockCountSource } from "./eth-rpc";

afterEach(() => vi.unstubAllGlobals());

describe("findBlockAtOrAfter", () => {
  it("finds the lowest block at or after the target timestamp", async () => {
    const getTimestamp = async (n: number) => n * 12;
    expect(await findBlockAtOrAfter(6000, { head: 1000, getTimestamp })).toBe(500);
  });

  it("returns block 1 when the target precedes the chain", async () => {
    const getTimestamp = async (n: number) => n * 12;
    expect(await findBlockAtOrAfter(0, { head: 1000, getTimestamp })).toBe(1);
  });

  it("handles non-uniform block times", async () => {
    const ts = [0, 100, 112, 130, 140, 152, 170, 180, 200]; // index === block number
    const getTimestamp = async (n: number) => ts[n];
    expect(await findBlockAtOrAfter(135, { head: 8, getTimestamp })).toBe(4);
    expect(await findBlockAtOrAfter(112, { head: 8, getTimestamp })).toBe(2);
  });
});

/**
 * A fake `fetch` modelling a chain where block N has timestamp N (one second
 * per block). `badUrls` substrings always reject, to exercise endpoint fallback.
 */
function mockChainFetch(opts: { head: number; badUrls?: string[] }) {
  return vi.fn(async (url: string, init: { body: string }) => {
    if (opts.badUrls?.some((b) => url.includes(b))) {
      throw new Error("ECONNREFUSED");
    }
    const { method, params } = JSON.parse(init.body) as {
      method: string;
      params: unknown[];
    };
    if (method === "eth_blockNumber") {
      return { ok: true, json: async () => ({ result: `0x${opts.head.toString(16)}` }) };
    }
    if (method === "eth_getBlockByNumber") {
      const n = parseInt(params[0] as string, 16);
      return {
        ok: true,
        json: async () => ({ result: { timestamp: `0x${n.toString(16)}` } }),
      };
    }
    throw new Error(`unexpected method ${method}`);
  });
}

describe("EthRpcBlockCountSource.totalBlocks", () => {
  it("counts execution blocks within the UTC day", async () => {
    const start = Math.floor(Date.parse("2026-05-20T00:00:00Z") / 1000);
    vi.stubGlobal("fetch", mockChainFetch({ head: start + 200_000 }));
    const source = new EthRpcBlockCountSource(["https://rpc.test"]);
    expect(await source.totalBlocks("2026-05-20")).toBe(86_400);
  });

  it("falls back to the next endpoint when one fails", async () => {
    const start = Math.floor(Date.parse("2026-05-20T00:00:00Z") / 1000);
    vi.stubGlobal("fetch", mockChainFetch({ head: start + 200_000, badUrls: ["bad.test"] }));
    const source = new EthRpcBlockCountSource(["https://bad.test", "https://good.test"]);
    expect(await source.totalBlocks("2026-05-20")).toBe(86_400);
  });
});
