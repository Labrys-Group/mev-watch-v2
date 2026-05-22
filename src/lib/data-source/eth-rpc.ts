import type { BlockCountSource } from "./types";

/** Public Ethereum JSON-RPC endpoints, tried in order. No API key required. */
const PUBLIC_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://cloudflare-eth.com",
];

interface JsonRpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

/**
 * Binary-search for the lowest block number whose timestamp is >= `targetTs`.
 * `getTimestamp` is injected so the search is unit-testable without a network.
 */
export async function findBlockAtOrAfter(
  targetTs: number,
  opts: { head: number; getTimestamp: (n: number) => Promise<number> },
): Promise<number> {
  let lo = 1;
  let hi = opts.head;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await opts.getTimestamp(mid)) < targetTs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Counts execution-layer blocks per UTC day via a public Ethereum RPC, so the
 * refresh pipeline can derive `non-boosted = totalBlocks − MEV-boost blocks`.
 */
export class EthRpcBlockCountSource implements BlockCountSource {
  readonly name = "eth-rpc";

  private readonly endpoints: string[];

  /** `endpoints` is injectable for tests; production prepends `ETH_RPC_URL`
   *  (if set) to the public fallback list. */
  constructor(endpoints?: string[]) {
    if (endpoints) {
      this.endpoints = endpoints;
    } else {
      const override = process.env.ETH_RPC_URL;
      this.endpoints = override ? [override, ...PUBLIC_RPCS] : [...PUBLIC_RPCS];
    }
  }

  /** A JSON-RPC call, advancing through the endpoint list on any failure. */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    let lastError: unknown;
    for (const url of this.endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "user-agent": "mev-watch/1.0",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as JsonRpcResponse<T>;
        if (json.error) throw new Error(json.error.message ?? "JSON-RPC error");
        if (json.result === undefined) throw new Error("JSON-RPC: empty result");
        return json.result;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      `all RPC endpoints failed for ${method}: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  private async blockTimestamp(blockNumber: number): Promise<number> {
    const block = await this.rpc<{ timestamp: string }>("eth_getBlockByNumber", [
      `0x${blockNumber.toString(16)}`,
      false,
    ]);
    return parseInt(block.timestamp, 16);
  }

  /** Total execution-layer blocks proposed during the given UTC date. */
  async totalBlocks(date: string): Promise<number> {
    const startTs = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
    const endTs = startTs + 86_400;

    const head = parseInt(await this.rpc<string>("eth_blockNumber", []), 16);
    const getTimestamp = (n: number) => this.blockTimestamp(n);

    const [firstOfDay, firstOfNextDay] = await Promise.all([
      findBlockAtOrAfter(startTs, { head, getTimestamp }),
      findBlockAtOrAfter(endTs, { head, getTimestamp }),
    ]);
    return firstOfNextDay - firstOfDay;
  }
}
