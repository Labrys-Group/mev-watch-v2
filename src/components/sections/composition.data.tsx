import { Composition } from "@/components/sections/composition";
import { getLastRefresh, getLatestStats } from "@/lib/queries";
import { readInitialLedger } from "@/lib/live-ledger/service";
import { getDataFreshness } from "@/lib/data-freshness";
import type { LatestStats } from "@/lib/queries";

// Zeroed stand-in for the daily snapshot — keeps the real Composition layout
// (legend, 2 block-count cards, live ledger) on screen while showing 0s for
// every number. The live ledger still polls /api/epochs independently.
const EMPTY_LATEST: LatestStats = {
  date: "—",
  censorshipPct: 0,
  neutralPct: 0,
  nonBoostPct: 0,
  totalBlocks: 0,
};

export async function CompositionData() {
  const [latest, ledger, lastRefresh] = await Promise.all([
    getLatestStats(),
    readInitialLedger(),
    getLastRefresh(),
  ]);

  const freshness = getDataFreshness({
    latestDate: latest?.date ?? null,
    generatedAt: lastRefresh?.ranAt ?? null,
  });

  return (
    <Composition
      latest={latest ?? EMPTY_LATEST}
      ledger={ledger}
      freshness={freshness}
    />
  );
}
