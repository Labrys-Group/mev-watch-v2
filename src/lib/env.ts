/**
 * Reads the libSQL database URL. Throws if it is not configured,
 * so misconfiguration fails loudly rather than silently connecting nowhere.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Copy .env.example to .env.",
    );
  }
  return url;
}

/** Reads the Dune Analytics API key. Throws if unset. */
export function getDuneApiKey(): string {
  const key = process.env.DUNE_API_KEY;
  if (!key) {
    throw new Error(
      "DUNE_API_KEY environment variable is not set. Get a free key at dune.com.",
    );
  }
  return key;
}

/**
 * Reads the numeric ID of the saved Dune query that returns per-slot winning
 * relay counts. See docs/dune/payloads-delivered.sql for the query itself.
 */
export function getDunePayloadsQueryId(): number {
  const raw = process.env.DUNE_PAYLOADS_QUERY_ID;
  if (!raw) {
    throw new Error(
      "DUNE_PAYLOADS_QUERY_ID environment variable is not set.",
    );
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      `DUNE_PAYLOADS_QUERY_ID must be a positive integer, got: ${raw}`,
    );
  }
  return id;
}
