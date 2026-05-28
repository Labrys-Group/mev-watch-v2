import { Hero } from "@/components/sections/hero";
import { getLastRefresh, getLatestStats, getTrend } from "@/lib/queries";
import { computeHeroVerdict } from "@/lib/hero-verdict";
import { getDataFreshness } from "@/lib/data-freshness";

export async function HeroData() {
  const [trend, latest, lastRefresh] = await Promise.all([
    getTrend(),
    getLatestStats(),
    getLastRefresh(),
  ]);

  // Pre-seed local dev: the verdict math would render "CONTAINED 0%" which is
  // misleading. Show an honest empty-state hero card instead.
  if (trend.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8">
        <div className="mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-fg-muted">
          <span aria-hidden="true">{"// "}</span>NO DATA YET
        </div>
        <h1
          className="m-0 font-sans font-extrabold leading-[0.95] tracking-[-0.035em] text-foreground"
          style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
        >
          Database is empty.
        </h1>
        <p className="mt-6 font-mono text-[13px] leading-snug text-fg-muted">
          Run <code className="font-mono text-foreground">pnpm update-data</code>{" "}
          to generate the local data snapshot, then reload.
        </p>
      </section>
    );
  }

  const verdict = computeHeroVerdict(trend);
  const freshness = getDataFreshness({
    latestDate: latest?.date ?? null,
    generatedAt: lastRefresh?.ranAt ?? null,
  });
  return <Hero verdict={verdict} freshness={freshness} />;
}
