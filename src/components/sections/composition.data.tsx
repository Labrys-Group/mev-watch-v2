import { Composition } from "@/components/sections/composition";
import { getLastRefresh, getLatestStats } from "@/lib/queries";
import { Section } from "@/components/section";
import { readInitialLedger } from "@/lib/live-ledger/service";
import { getDataFreshness } from "@/lib/data-freshness";

export async function CompositionData() {
  const [latest, ledger, lastRefresh] = await Promise.all([
    getLatestStats(),
    readInitialLedger(),
    getLastRefresh(),
  ]);

  if (!latest) {
    return (
      <Section
        label="01 / POST-MERGE COMPOSITION"
        title="Censoring vs. neutral relays."
      >
        <p className="font-mono text-[13px] leading-snug text-fg-muted">
          No daily snapshots yet — run{" "}
          <code className="font-mono text-foreground">pnpm update-data</code>{" "}
          to generate the checked-in data snapshot, then reload.
        </p>
      </Section>
    );
  }

  const freshness = getDataFreshness({
    latestDate: latest.date,
    generatedAt: lastRefresh?.ranAt ?? null,
  });

  return <Composition latest={latest} ledger={ledger} freshness={freshness} />;
}
