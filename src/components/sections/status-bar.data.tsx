import { StatusBar } from "@/components/sections/status-bar";
import { getLatestStats, getLastRefresh } from "@/lib/queries";
import { getDataFreshness } from "@/lib/data-freshness";

export async function StatusBarData() {
  const [latest, lastRefresh] = await Promise.all([
    getLatestStats(),
    getLastRefresh(),
  ]);

  const freshness = getDataFreshness({
    latestDate: latest?.date ?? null,
    generatedAt: lastRefresh?.ranAt ?? null,
  });

  if (!latest) {
    return (
      <StatusBar
        connected={false}
        latestDate="—"
        censorshipPct={0}
        lastRefresh={null}
        freshness={freshness}
      />
    );
  }

  return (
    <StatusBar
      latestDate={latest.date}
      censorshipPct={latest.censorshipPct}
      lastRefresh={lastRefresh?.ranAt ?? null}
      freshness={freshness}
    />
  );
}
