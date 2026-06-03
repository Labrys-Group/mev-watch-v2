import { z } from "zod";
import {
  MevWatchDaySchema,
  MevWatchSnapshotSchema,
  type MevWatchDay,
  type MevWatchSnapshot,
} from "./mev-watch-data";
import { DEFAULT_START_DATE } from "./mev-watch-generator-constants";
import {
  createReadOnlyMevWatchDatabase,
  initializeMevWatchDatabase,
  readSnapshotFromDatabase,
  readDatesMissingTotalChainBlocks,
  readSourceEndDate,
  SQLITE_DATA_PATH,
  updateDayTotalChainBlocks,
  upsertDay,
} from "./mev-watch-sqlite";

export type { MevWatchDay, MevWatchSnapshot } from "./mev-watch-data";

export { DEFAULT_START_DATE } from "./mev-watch-generator-constants";
export const DATA_PATH = SQLITE_DATA_PATH;

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

interface FetchRelayscanDayOpts {
  attempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

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
    const db = createReadOnlyMevWatchDatabase(filePath);
    try {
      return readSnapshotFromDatabase(db);
    } finally {
      db.close();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptySnapshot();
    }
    throw error;
  }
}

export async function appendSnapshotDays(
  snapshot: MevWatchSnapshot,
  filePath = DATA_PATH,
): Promise<void> {
  const parsed = MevWatchSnapshotSchema.parse(snapshot);

  const db = initializeMevWatchDatabase(filePath, {
    generatedAt: parsed.generatedAt,
  });
  try {
    assertAppendOnlyDays(readSourceEndDate(db), parsed.days);
    for (const day of parsed.days) {
      upsertDay(db, day, parsed.generatedAt);
    }
  } finally {
    db.close();
  }
}

function assertAppendOnlyDays(
  sourceEndDate: string | null,
  days: MevWatchDay[],
): void {
  if (!sourceEndDate) return;
  const staleDay = days.find((day) => day.date <= sourceEndDate);
  if (!staleDay) return;
  throw new Error(
    `appendSnapshotDays only accepts days after existing sourceEndDate (${sourceEndDate}); received ${staleDay.date}`,
  );
}

export async function fetchRelayscanDay(
  date: string,
  opts: FetchRelayscanDayOpts = {},
): Promise<Omit<MevWatchDay, "totalChainBlocks">> {
  const attempts = opts.attempts ?? 3;
  const retryDelayMs = opts.retryDelayMs ?? 1000;
  const timeoutMs = positiveIntegerOrFallback(opts.timeoutMs, 8000);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`https://www.relayscan.io/stats/day/${date}/json`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const retryable = isRetryableRelayscanStatus(response.status);
        if (retryable && attempt < attempts) {
          lastError = new Error(`HTTP ${response.status}`);
          await sleep(retryDelayMs);
          continue;
        }
        throw new Error(`relayscan request failed for ${date}: HTTP ${response.status}`);
      }
      const parsed = RelayscanDaySchema.parse(await response.json());
      if (parsed.date !== date) {
        throw new Error(`relayscan returned ${parsed.date} for ${date}`);
      }
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
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(retryDelayMs);
        continue;
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`relayscan request failed for ${date}: ${message}`);
}

function isRetryableRelayscanStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
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

interface FetchMevWatchDayDeps {
  fetchRelayscanDay?: typeof fetchRelayscanDay;
  fetchTotalChainBlocks?: typeof fetchTotalChainBlocks;
  warn?: (message: string) => void;
}

export async function fetchMevWatchDay(
  date: string,
  deps: FetchMevWatchDayDeps = {},
): Promise<MevWatchDay> {
  const fetchRelayDay = deps.fetchRelayscanDay ?? fetchRelayscanDay;
  const fetchBlockCount = deps.fetchTotalChainBlocks ?? fetchTotalChainBlocks;
  const warn = deps.warn ?? console.warn;

  const day = await fetchRelayDay(date);
  let totalChainBlocks: number | null = null;
  try {
    totalChainBlocks = await fetchBlockCount(date);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warn(`block count unavailable for ${date}: ${message}`);
  }
  return { ...day, totalChainBlocks };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface UpdateProgress {
  date: string;
  index: number;
  total: number;
}

export interface PersistProgress {
  persistedDates: string[];
  sourceEndDate: string;
}

export interface UpdateDataFileOptions {
  filePath?: string;
  dryRun?: boolean;
  now?: Date;
  fetchDay?: (date: string) => Promise<MevWatchDay>;
  fetchTotalChainBlocks?: (date: string) => Promise<number>;
  onProgress?: (progress: UpdateProgress) => void;
  onPersist?: (progress: PersistProgress) => Promise<void> | void;
  sleepMs?: number;
  concurrency?: number;
  writeEvery?: number;
  maxDays?: number;
  maxRepairDays?: number;
}

export async function updateDataFile(
  opts: UpdateDataFileOptions = {},
): Promise<{ changed: boolean; fetchedDates: string[]; snapshot: MevWatchSnapshot }> {
  const filePath = opts.filePath ?? DATA_PATH;

  const db = initializeMevWatchDatabase(filePath);
  try {
    const repairedDates = opts.dryRun ? [] : await repairMissingBlockCounts(db, opts);
    const existingSnapshot = readSnapshotFromDatabase(db);
    const sourceEndDate = readSourceEndDate(db);
    const start = sourceEndDate
      ? addUtcDays(sourceEndDate, 1)
      : existingSnapshot.sourceStartDate;
    const end = yesterdayUtc(opts.now);
    const dates = limitDateRange(buildDateRange(start, end), opts.maxDays);
    if (dates.length === 0) {
      return {
        changed: repairedDates.length > 0,
        fetchedDates: [],
        snapshot: existingSnapshot,
      };
    }

    const fetchDay = opts.fetchDay ?? fetchMevWatchDay;
    const sleepMs = opts.sleepMs ?? 300;
    const concurrency = positiveIntegerOrFallback(opts.concurrency, 1);
    const writeEvery = Math.max(0, Math.floor(opts.writeEvery ?? 0));
    const days = new Array<MevWatchDay>(dates.length);
    let nextIndex = 0;
    let completed = 0;
    let persistedThrough = 0;
    let flushChain = Promise.resolve();

    const flush = async () => {
      flushChain = flushChain.then(async () => {
        if (opts.dryRun) return;
        const contiguousDays: MevWatchDay[] = [];
        for (const day of days) {
          if (!day) break;
          contiguousDays.push(day);
        }
        if (contiguousDays.length <= persistedThrough) return;
        const generatedAt = new Date().toISOString();
        const persistedDays = contiguousDays.slice(persistedThrough);
        for (const day of persistedDays) {
          upsertDay(db, day, generatedAt);
        }
        persistedThrough = contiguousDays.length;
        await notifyPersist(opts, persistedDays);
      });
      await flushChain;
    };

    async function worker() {
      while (nextIndex < dates.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const date = dates[currentIndex];
        days[currentIndex] = await fetchDay(date);
        completed += 1;
        opts.onProgress?.({ date, index: completed, total: dates.length });
        if (writeEvery > 0 && completed % writeEvery === 0) {
          await flush();
        }
        if (sleepMs > 0) await sleep(sleepMs);
      }
    }

    const workerResults = await Promise.allSettled(
      Array.from({ length: Math.min(concurrency, dates.length) }, () => worker()),
    );
    const workerFailure = workerResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (workerFailure) {
      await flush();
      throw workerFailure.reason;
    }

    await flush();
    if (!opts.dryRun && persistedThrough < dates.length) {
      const generatedAt = new Date().toISOString();
      const persistedDays = days.slice(persistedThrough);
      for (const day of persistedDays) {
        upsertDay(db, day, generatedAt);
      }
      persistedThrough = dates.length;
      await notifyPersist(opts, persistedDays);
    }
    const next = opts.dryRun
      ? mergeSnapshotDays(existingSnapshot, days)
      : readSnapshotFromDatabase(db);
    return { changed: true, fetchedDates: dates, snapshot: next };
  } finally {
    db.close();
  }
}

function limitDateRange(dates: string[], maxDays?: number): string[] {
  if (maxDays === undefined) return dates;
  const limit = Math.max(0, Math.floor(maxDays));
  return dates.slice(0, limit);
}

function positiveIntegerOrFallback(value: number | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

async function repairMissingBlockCounts(
  db: ReturnType<typeof initializeMevWatchDatabase>,
  opts: UpdateDataFileOptions,
): Promise<string[]> {
  const dates = limitDateRange(
    readDatesMissingTotalChainBlocks(db),
    opts.maxRepairDays,
  );
  if (dates.length === 0) return [];
  const fetchBlockCount = opts.fetchTotalChainBlocks ?? fetchTotalChainBlocks;
  const repaired: string[] = [];

  for (const date of dates) {
    try {
      const totalChainBlocks = await fetchBlockCount(date);
      updateDayTotalChainBlocks(db, date, totalChainBlocks);
      repaired.push(date);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`block count repair unavailable for ${date}: ${message}`);
    }
  }

  if (repaired.length > 0) {
    await opts.onPersist?.({
      persistedDates: repaired,
      sourceEndDate: repaired.at(-1) as string,
    });
  }
  return repaired;
}

async function notifyPersist(
  opts: UpdateDataFileOptions,
  persistedDays: MevWatchDay[],
): Promise<void> {
  if (persistedDays.length === 0) return;
  const sourceEndDate = persistedDays.at(-1)?.date;
  if (!sourceEndDate) return;
  await opts.onPersist?.({
    persistedDates: persistedDays.map((day) => day.date),
    sourceEndDate,
  });
}
