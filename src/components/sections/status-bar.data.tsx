import { StatusBar } from "@/components/sections/status-bar";
import { getLatestStats, getLastRefresh } from "@/lib/queries";
import { getDataFreshness } from "@/lib/data-freshness";

export async function StatusBarData() {
  const [latest, lastRefresh] = await Promise.all([
    getLatestStats(),
    getLastRefresh(),
  ]);

  // Pre-seed local dev: surface the seed hint directly in the sticky bar so
  // the dev knows why everything else is empty.
  if (!latest) {
    return (
      <div
        className="relative overflow-hidden border-b border-border-labrys bg-panel-alt font-mono text-fg-muted"
        role="status"
      >
        <div className="flex items-center gap-3 px-3 py-2 text-[12px] tracking-[0.1em] uppercase">
          <span className="text-warn">DB EMPTY</span>
          <span className="normal-case tracking-normal text-foreground">
            run <code className="font-mono">pnpm update-data</code> to generate the data snapshot
          </span>
        </div>
      </div>
    );
  }

  const freshness = getDataFreshness({
    latestDate: latest.date,
    generatedAt: lastRefresh?.ranAt ?? null,
  });

  return (
    <StatusBar
      latestDate={latest.date}
      censorshipPct={latest.censorshipPct}
      lastRefresh={lastRefresh?.ranAt ?? null}
      freshness={freshness}
    />
  );
}
