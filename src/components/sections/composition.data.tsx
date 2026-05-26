import { Composition } from "@/components/sections/composition";
import { getLatestStats } from "@/lib/queries";
import { Section } from "@/components/section";
import { readInitialLedger } from "@/lib/live-ledger/service";

export async function CompositionData() {
  const [latest, ledger] = await Promise.all([
    getLatestStats(),
    readInitialLedger(),
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

  return <Composition latest={latest} ledger={ledger} />;
}
