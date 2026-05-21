import { db } from "../db";
import { refreshLog } from "../db/schema";
import type { DataSource } from "../data-source/types";
import { persistDailySnapshot } from "./persist";

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
  persist: (day: Awaited<ReturnType<DataSource["fetchDay"]>>) => Promise<void>;
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
 */
export async function refreshDay(
  date: string,
  source: DataSource,
  deps: RefreshDeps = defaultDeps,
): Promise<RefreshResult> {
  try {
    const day = await source.fetchDay(date);
    await deps.persist(day);
    await deps.log({
      status: "ok",
      source: source.name,
      message: `Refreshed ${date}: ${day.relays.length} relays`,
    });
    return { status: "ok", date };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.log({ status: "error", source: source.name, message });
    return { status: "error", date, message };
  }
}
