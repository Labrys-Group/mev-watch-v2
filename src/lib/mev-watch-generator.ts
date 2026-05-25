import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  MevWatchDaySchema,
  MevWatchSnapshotSchema,
  type MevWatchDay,
  type MevWatchSnapshot,
} from "./mev-watch-data";

export type { MevWatchDay, MevWatchSnapshot } from "./mev-watch-data";

export const DEFAULT_START_DATE = "2022-09-15";
export const DATA_PATH = path.join(process.cwd(), "src/data/mev-watch.json");

const RelayscanRelaySchema = z.object({
  relay: z.string(),
  num_payloads: z.number(),
});

const RelayscanBuilderSchema = z.object({
  info: z.object({
    extra_data: z.string(),
    num_blocks: z.number(),
  }),
});

const RelayscanDaySchema = z.object({
  date: z.string(),
  relays: z.array(RelayscanRelaySchema),
  builders: z.array(RelayscanBuilderSchema),
});

const PUBLIC_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://cloudflare-eth.com",
];

export function addUtcDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function yesterdayUtc(now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function buildDateRange(start: string, end: string): string[] {
  if (start > end) return [];
  const dates: string[] = [];
  for (let date = start; date <= end; date = addUtcDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function emptySnapshot(
  generatedAt = new Date().toISOString(),
): MevWatchSnapshot {
  return {
    schemaVersion: 1,
    generatedAt,
    sourceStartDate: DEFAULT_START_DATE,
    sourceEndDate: null,
    days: [],
  };
}

export function nextMissingStartDate(snapshot: MevWatchSnapshot): string {
  return snapshot.sourceEndDate
    ? addUtcDays(snapshot.sourceEndDate, 1)
    : snapshot.sourceStartDate;
}

export function mergeSnapshotDays(
  snapshot: MevWatchSnapshot,
  incomingDays: MevWatchDay[],
  generatedAt = new Date().toISOString(),
): MevWatchSnapshot {
  const byDate = new Map<string, MevWatchDay>();
  for (const day of [...snapshot.days, ...incomingDays]) {
    byDate.set(day.date, MevWatchDaySchema.parse(day));
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    schemaVersion: 1,
    generatedAt,
    sourceStartDate: days[0]?.date ?? snapshot.sourceStartDate,
    sourceEndDate: days.at(-1)?.date ?? null,
    days,
  };
}

export async function readSnapshot(
  filePath = DATA_PATH,
): Promise<MevWatchSnapshot> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return MevWatchSnapshotSchema.parse(JSON.parse(text));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptySnapshot();
    }
    throw error;
  }
}

export async function writeSnapshot(
  snapshot: MevWatchSnapshot,
  filePath = DATA_PATH,
): Promise<void> {
  const parsed = MevWatchSnapshotSchema.parse(snapshot);
  await fs.writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
}

export async function fetchRelayscanDay(date: string): Promise<Omit<MevWatchDay, "totalChainBlocks">> {
  const response = await fetch(`https://www.relayscan.io/stats/day/${date}/json`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`relayscan request failed for ${date}: HTTP ${response.status}`);
  }
  const parsed = RelayscanDaySchema.parse(await response.json());
  return {
    date: parsed.date,
    relays: parsed.relays.map((relay) => ({
      relayId: relay.relay,
      numPayloads: relay.num_payloads,
    })),
    builders: parsed.builders.map((builder) => ({
      builderId: builder.info.extra_data,
      numBlocks: builder.info.num_blocks,
    })),
  };
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "mev-watch/1.0",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = (await response.json()) as JsonRpcResponse<T>;
  if (json.error) throw new Error(json.error.message ?? "JSON-RPC error");
  if (json.result === undefined) throw new Error("JSON-RPC: empty result");
  return json.result;
}

async function rpcWithFallback<T>(
  endpoints: string[],
  method: string,
  params: unknown[],
): Promise<T> {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await rpc<T>(endpoint, method, params);
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

export async function findBlockAtOrAfter(
  targetTs: number,
  opts: { head: number; getTimestamp: (n: number) => Promise<number> },
): Promise<number> {
  let lo = 1;
  let hi = opts.head;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await opts.getTimestamp(mid)) < targetTs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export async function fetchTotalChainBlocks(
  date: string,
  endpoints = process.env.ETH_RPC_URL
    ? [process.env.ETH_RPC_URL, ...PUBLIC_RPCS]
    : PUBLIC_RPCS,
): Promise<number> {
  const startTs = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
  const endTs = startTs + 86_400;
  const head = parseInt(await rpcWithFallback<string>(endpoints, "eth_blockNumber", []), 16);
  const getTimestamp = async (blockNumber: number) => {
    const block = await rpcWithFallback<{ timestamp: string }>(endpoints, "eth_getBlockByNumber", [
      `0x${blockNumber.toString(16)}`,
      false,
    ]);
    return parseInt(block.timestamp, 16);
  };

  const [firstOfDay, firstOfNextDay] = await Promise.all([
    findBlockAtOrAfter(startTs, { head, getTimestamp }),
    findBlockAtOrAfter(endTs, { head, getTimestamp }),
  ]);
  return firstOfNextDay - firstOfDay;
}

export async function fetchMevWatchDay(date: string): Promise<MevWatchDay> {
  const [day, totalChainBlocks] = await Promise.all([
    fetchRelayscanDay(date),
    fetchTotalChainBlocks(date),
  ]);
  return { ...day, totalChainBlocks };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function updateDataFile(opts: {
  filePath?: string;
  dryRun?: boolean;
  now?: Date;
  fetchDay?: (date: string) => Promise<MevWatchDay>;
} = {}): Promise<{ changed: boolean; fetchedDates: string[]; snapshot: MevWatchSnapshot }> {
  const filePath = opts.filePath ?? DATA_PATH;
  const snapshot = await readSnapshot(filePath);
  const start = nextMissingStartDate(snapshot);
  const end = yesterdayUtc(opts.now);
  const dates = buildDateRange(start, end);
  if (dates.length === 0) {
    return { changed: false, fetchedDates: [], snapshot };
  }

  const fetchDay = opts.fetchDay ?? fetchMevWatchDay;
  const days: MevWatchDay[] = [];
  for (const date of dates) {
    days.push(await fetchDay(date));
    await sleep(300);
  }

  const next = mergeSnapshotDays(snapshot, days);
  if (!opts.dryRun) await writeSnapshot(next, filePath);
  return { changed: true, fetchedDates: dates, snapshot: next };
}
