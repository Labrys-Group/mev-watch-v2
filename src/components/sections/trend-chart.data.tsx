import { TrendChart } from "@/components/sections/trend-chart";
import { getTrend } from "@/lib/queries";

export async function TrendChartData() {
  // <TrendChart trend={[]} /> renders the real shell — NOW/PEAK/TROUGH all
  // at 0.0%, range buttons, legend, axes, plus an in-chart "Awaiting first
  // daily snapshot" caption — so we don't need a special CLI empty state.
  const trend = await getTrend();
  return <TrendChart trend={trend} />;
}
