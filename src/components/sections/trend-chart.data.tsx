import { TrendChart } from "@/components/sections/trend-chart";
import { getTrend, summarise } from "@/lib/queries";
import { Section } from "@/components/section";

export async function TrendChartData() {
  const trend = await getTrend();
  const summary = summarise(trend);

  if (trend.length === 0 || !summary) {
    return (
      <Section
        label="02 / CENSORSHIP OVER TIME"
        title="Censorship % since the Merge."
      >
        <p className="font-mono text-[13px] leading-snug text-fg-muted">
          No daily snapshots yet — run{" "}
          <code className="font-mono text-foreground">pnpm seed-history</code>{" "}
          to backfill, then reload.
        </p>
      </Section>
    );
  }

  return <TrendChart trend={trend} summary={summary} />;
}
