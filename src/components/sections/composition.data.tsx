import { Composition } from "@/components/sections/composition";
import { getLatestStats } from "@/lib/queries";
import { Section } from "@/components/section";

export async function CompositionData() {
  const latest = await getLatestStats();

  if (!latest) {
    return (
      <Section
        label="01 / POST-MERGE COMPOSITION"
        title="Censoring vs. neutral relays."
      >
        <p className="font-mono text-[13px] leading-snug text-fg-muted">
          No daily snapshots yet — run{" "}
          <code className="font-mono text-foreground">pnpm seed-history</code>{" "}
          to backfill, then reload.
        </p>
      </Section>
    );
  }

  return <Composition latest={latest} />;
}
