import { RelayscanDataSource } from "./relayscan";
import type { DataSource } from "./types";

/** Returns the active relay data source. */
export function getDataSource(): DataSource {
  return new RelayscanDataSource();
}
