import { getDuneApiKey, getDunePayloadsQueryId } from "../env";
import { CompositeDataSource } from "./composite";
import { DuneDataSource } from "./dune";
import { RelayscanDataSource } from "./relayscan";
import type { DataSource } from "./types";

/**
 * Returns the active relay data source, selected by the DATA_SOURCE_MODE env
 * var. Defaults to relayscan (legacy) until the composite is fully validated
 * in production. See spec §4.2 for the cutover sequence.
 *
 *   relayscan  — relayscan.io only (legacy; inflates the headline %).
 *   composite  — Dune for relays + relayscan for builders.
 */
export function getDataSource(): DataSource {
  const mode = process.env.DATA_SOURCE_MODE ?? "relayscan";
  if (mode === "relayscan") return new RelayscanDataSource();
  if (mode === "composite") {
    return new CompositeDataSource(
      new DuneDataSource(getDuneApiKey(), getDunePayloadsQueryId()),
      new RelayscanDataSource(),
    );
  }
  throw new Error(
    `Unknown DATA_SOURCE_MODE: '${mode}' (expected 'relayscan' or 'composite')`,
  );
}
