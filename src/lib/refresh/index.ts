import { db } from "../db";
import { refreshLog } from "../db/schema";
import type { DataSource, BlockCountSource, DaySnapshot } from "../data-source/types";
import { persistDailySnapshot } from "./persist";
import { sendSlackAlert } from "./slack";

export interface RefreshResult {
  status: "ok" | "error";
  date: string;
  message?: string;
}

interface RefreshEntry {
  status: string;
  source: string;
  message: string;
}

/** Injectable side effects — defaulted to the real DB, overridable in tests. */
export interface RefreshDeps {
  persist: (day: DaySnapshot) => Promise<void>;
  log: (entry: RefreshEntry) => Promise<void>;
}

const defaultDeps: RefreshDeps = {
  persist: persistDailySnapshot,
  log: async (entry) => {
    await db.insert(refreshLog).values(entry);
  },
};

/**
 * Fetch, compute, and persist one day of stats. Never throws — failures are
 * recorded in `refresh_log` and returned as an error result, so a bad upstream
 * day never crashes the caller (cron job or seed script).
 *
 * A failure of `blockSource` alone does NOT fail the refresh: the day is
 * persisted with `totalChainBlocks = 0` (non-boost share 0) and the log entry
 * notes it. `scripts/backfill-nonboost.ts` repairs such days later — the
 * censorship metric must not be held hostage to a public RPC's uptime.
 */
export async function refreshDay(
  date: string,
  source: DataSource,
  blockSource: BlockCountSource,
  deps: RefreshDeps = defaultDeps,
): Promise<RefreshResult> {
  try {
    const day = await source.fetchDay(date);

    let totalChainBlocks = 0;
    let blockNote = "";
    try {
      totalChainBlocks = await blockSource.totalBlocks(date);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      blockNote = ` — block count unavailable: ${message}`;
      await sendSlackAlert(`Block count unavailable for ${date}: ${message}`);
    }

    const snapshot: DaySnapshot = { ...day, totalChainBlocks };
    await deps.persist(snapshot);
    await deps.log({
      status: "ok",
      source: source.name,
      message: `Refreshed ${date}: ${day.relays.length} relays${blockNote}`,
    });
    return { status: "ok", date };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.log({ status: "error", source: source.name, message });
    await sendSlackAlert(`Refresh failed for ${date}: ${message}`);
    return { status: "error", date, message };
  }
}
