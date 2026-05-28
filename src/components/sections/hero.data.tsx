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

  // `computeHeroVerdict([])` returns an "offline" verdict — neutral tone,
  // 0.0% current, "OFFLINE" word, em-dash arrow — so the hero layout renders
  // its real shape even before the first daily snapshot lands.
  const verdict = computeHeroVerdict(trend);
  const freshness = getDataFreshness({
    latestDate: latest?.date ?? null,
    generatedAt: lastRefresh?.ranAt ?? null,
  });
  return <Hero verdict={verdict} freshness={freshness} />;
}
