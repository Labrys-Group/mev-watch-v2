-- Saved as a Dune query and referenced by ID from
-- src/lib/data-source/dune.ts (see DUNE_PAYLOADS_QUERY_ID env var).
-- Returns one row per relay per day, where num_payloads counts only the
-- slots whose claimed block_hash matches the canonical chain block —
-- i.e. the actual winning relay for each slot.

SELECT
  pd.relay                                                           AS relay,
  COUNT(*)                                                           AS num_payloads,
  CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(10,4))    AS percent
FROM mevboost.payloads_delivered AS pd
JOIN ethereum.blocks            AS b
  ON pd.block_hash = b.hash
WHERE pd.block_date = DATE '{{date}}'
GROUP BY pd.relay
ORDER BY num_payloads DESC
