import { RelayscanDataSource } from "./relayscan";
import type { DataSource } from "./types";

/**
 * Returns the active relay data source.
 *
 * Reads DATA_SOURCE_MODE so a stale env var from a previous deploy (e.g. a
 * leftover `composite` from the cancelled per-slot-relay-attribution cutover)
 * fails loudly instead of silently degrading. Only `relayscan` is supported.
 *
 * Returns a fresh instance per call — callers in hot loops (e.g. seed-history)
 * should hoist the result.
 */
export function getDataSource(): DataSource {
  const mode = process.env.DATA_SOURCE_MODE ?? "relayscan";
  if (mode !== "relayscan") {
    throw new Error(
      `Unknown DATA_SOURCE_MODE: '${mode}' (only 'relayscan' is supported)`,
    );
  }
  return new RelayscanDataSource();
}
