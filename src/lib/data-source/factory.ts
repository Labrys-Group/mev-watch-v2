import { RelayscanDataSource } from "./relayscan";
import type { DataSource } from "./types";

/**
 * Returns the active relay data source.
 *
 * Today `relayscan` is the only supported value; the factory exists because the
 * per-slot honest-metric work (`docs/superpowers/specs/2026-05-24-per-slot-honest-metric-design.md`)
 * adds a parallel `PerSlotDataSource` that runs alongside relayscan. Keeping
 * the env-var dispatch in place means that:
 *   (a) a stale value from a previous deploy fails loudly instead of silently
 *       degrading — see the cancelled `composite` cutover that motivated the
 *       guard originally;
 *   (b) when Phase B lands, switching pipelines is a config change, not a
 *       refactor of every caller.
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
