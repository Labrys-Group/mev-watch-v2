// Origin re-polls relay APIs at most every 20s per server instance; CDN serves
// a cached response for 15s. Decoupled because tighter edge TTL gives a more
// responsive grid without raising relay-poll volume on origin.
export const LIVE_LEDGER_REFRESH_INTERVAL_MS = 20_000;
export const LIVE_LEDGER_CACHE_SECONDS = 15;
