"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TrendPoint } from "@/lib/queries";
import { toCompositionPoint, type CompositionPoint } from "@/lib/composition";
import { formatPercent, formatDateShort } from "@/lib/format";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";

interface TrendChartProps {
  trend: TrendPoint[];
}

type Range = "ALL" | "1Y" | "90D";

const RANGE_LABELS: Range[] = ["ALL", "1Y", "90D"];

function getSlice(trend: TrendPoint[], range: Range): TrendPoint[] {
  if (range === "ALL") return trend;
  const count = range === "1Y" ? 365 : 90;
  return trend.slice(-count);
}

/** Pick a sparse subset of dates for X-axis ticks — at most ~8 ticks. */
function sparseTickIndices(data: { date: string }[], maxTicks = 8): string[] {
  if (data.length === 0) return [];
  const step = Math.max(1, Math.floor(data.length / maxTicks));
  const ticks: string[] = [];
  for (let i = 0; i < data.length; i += step) {
    ticks.push(data[i].date);
  }
  // Always include the last point.
  const last = data[data.length - 1].date;
  if (!ticks.includes(last)) ticks.push(last);
  return ticks;
}

/** One legend entry — a colour swatch plus its label. */
function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-2.5 h-2.5 shrink-0 ${className}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

interface TooltipItem {
  payload: CompositionPoint;
}

/** Custom tooltip — share-of-all-blocks bands and the share-of-MEV-boost
 *  headline grouped under their own denominators so the two %s don't read
 *  as a contradiction. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="border border-border-labrys bg-panel px-3 py-2 font-mono text-[11px] tracking-[0.06em] text-foreground">
      <div className="text-fg-muted mb-2">{formatDateShort(String(label))}</div>
      <div className="text-fg-muted text-[10px] tracking-[0.12em] uppercase mb-1">
        Share of all blocks
      </div>
      <div className="flex items-center justify-between gap-5">
        <LegendSwatch className="bg-non-boost" label="Non-boosted" />
        <span>{formatPercent(point.nonBoost)}</span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <LegendSwatch className="bg-ofac" label="Censored" />
        <span>{formatPercent(point.censored)}</span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <LegendSwatch className="bg-neutral-relay" label="Non-censoring" />
        <span>{formatPercent(point.nonCensored)}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-border-labrys">
        <div className="text-fg-muted text-[10px] tracking-[0.12em] uppercase mb-1">
          Share of MEV-boost
        </div>
        <div className="flex items-center justify-between gap-5">
          <span>Censorship</span>
          <span>{formatPercent(point.censorshipPct)}</span>
        </div>
      </div>
    </div>
  );
}

export function TrendChart({ trend }: TrendChartProps) {
  const [range, setRange] = useState<Range>("ALL");
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Phones get a sparser x-axis so the date labels never collide.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Defer mounting the chart until it scrolls into view so the area
  // sweep animation plays exactly when the reader reaches it.
  const chartRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setChartSize((current) => {
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const slice = useMemo(() => getSlice(trend, range), [trend, range]);
  const data = useMemo<CompositionPoint[]>(
    () => slice.map(toCompositionPoint),
    [slice],
  );
  // Recompute headline stats from whatever range is selected so NOW / PEAK /
  // TROUGH reflect the visible window, not the full series. Inlined (rather
  // than importing `summarise` from `@/lib/queries`) so this client component
  // doesn't pull the server-only db layer into the browser bundle.
  const rangeStats = useMemo(() => {
    if (slice.length === 0) return { current: 0, peak: 0, trough: 0 };
    let peak = slice[0].censorshipPct;
    let trough = slice[0].censorshipPct;
    for (const p of slice) {
      if (p.censorshipPct > peak) peak = p.censorshipPct;
      if (p.censorshipPct < trough) trough = p.censorshipPct;
    }
    return {
      current: slice[slice.length - 1].censorshipPct,
      peak,
      trough,
    };
  }, [slice]);
  const ticks = useMemo(
    () => sparseTickIndices(data, isNarrow ? 3 : 8),
    [data, isNarrow],
  );
  const chartReady = inView && chartSize.width > 0 && chartSize.height > 0;

  return (
    <Section
      label="02 / CENSORSHIP OVER TIME"
      title="Censorship % since the Merge."
      pattern="diagonal-hatch"
      accent="var(--warn)"
      aside={
        <>
          <span>BANDS // SHARE OF ALL BLOCKS</span>
          <br />
          <span>SEP 2022 — NOW</span>
        </>
      }
    >
      {/* Recessed chart well */}
      <div className="border border-border-labrys bg-background">
        {/* Stat header — headline censorship metric. The "OF MEV-BOOST"
            banner names the denominator inline so it can't be confused
            with the share-of-all-blocks bands below. */}
        <div className="border-b border-border-labrys">
          <div className="px-3 pt-2.5 pb-1 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
            Of MEV-boost
          </div>
          <div className="grid grid-cols-3 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
            <div className="px-3 pb-3 pt-1 border-r border-border-labrys transition-colors duration-200 hover:bg-panel-alt">
              NOW
              <strong className="block font-sans font-bold text-[18px] tracking-[-0.015em] text-foreground mt-1 normal-case">
                <CountUp value={rangeStats.current} decimals={1} suffix="%" />
              </strong>
            </div>
            <div className="px-3 pb-3 pt-1 border-r border-border-labrys transition-colors duration-200 hover:bg-panel-alt">
              PEAK
              <strong className="block font-sans font-bold text-[18px] tracking-[-0.015em] text-warn mt-1 normal-case">
                <CountUp value={rangeStats.peak} decimals={1} suffix="%" />
              </strong>
            </div>
            <div className="px-3 pb-3 pt-1 transition-colors duration-200 hover:bg-panel-alt">
              TROUGH
              <strong className="block font-sans font-bold text-[18px] tracking-[-0.015em] text-good mt-1 normal-case">
                <CountUp value={rangeStats.trough} decimals={1} suffix="%" />
              </strong>
            </div>
          </div>
        </div>

        {/* Range toggle + legend + chart */}
        <div className="p-0">
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 pt-4 pb-0">
            {/* Segment control toolbar */}
            <div className="inline-flex border border-border-labrys">
              {RANGE_LABELS.map((r, i) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={[
                    "font-mono font-semibold text-[10.5px] tracking-[0.12em] uppercase px-3 py-1.5 border-0 cursor-pointer transition-all duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand focus-visible:ring-inset",
                    i < RANGE_LABELS.length - 1 ? "border-r border-border-labrys" : "",
                    range === r
                      ? "bg-accent-brand text-panel"
                      : "bg-transparent text-fg-muted hover:text-foreground hover:bg-panel-alt",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={range === r}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
              <LegendSwatch className="bg-non-boost" label="Non-boosted" />
              <LegendSwatch className="bg-ofac" label="Censored" />
              <LegendSwatch className="bg-neutral-relay" label="Non-censoring" />
            </div>
          </div>

          {/* Chart */}
          <div className="h-[260px] min-w-0 w-full px-2 pb-2 pt-4 sm:h-[300px]">
            <div ref={chartRef} className="h-full min-w-0 w-full">
              {chartReady ? (
                <AreaChart
                  width={chartSize.width}
                  height={chartSize.height}
                  data={data}
                  margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                >
                  {/* Per-band fills fade from the band's line down to near-transparent. */}
                  <defs>
                    <linearGradient id="fill-non-censored" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--neutral)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--neutral)" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="fill-censored" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ofac)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--ofac)" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="fill-non-boost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--non-boost)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--non-boost)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke="var(--border-labrys)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    ticks={ticks}
                    tickFormatter={formatDateShort}
                    tick={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                    }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: "var(--fg-muted)", strokeWidth: 1 }}
                  />
                  {/* Declared bottom-to-top: non-censoring, censoring, non-boosted */}
                  <Area
                    type="monotone"
                    dataKey="nonCensored"
                    stackId="1"
                    stroke="var(--neutral)"
                    strokeWidth={2}
                    fill="url(#fill-non-censored)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{
                      r: 3.5,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                      fill: "var(--neutral)",
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="censored"
                    stackId="1"
                    stroke="var(--ofac)"
                    strokeWidth={2}
                    fill="url(#fill-censored)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{
                      r: 3.5,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                      fill: "var(--ofac)",
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="nonBoost"
                    stackId="1"
                    stroke="var(--non-boost)"
                    strokeWidth={2}
                    fill="url(#fill-non-boost)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{
                      r: 3.5,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                      fill: "var(--non-boost)",
                    }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              ) : (
                <div
                  className="h-full w-full animate-pulse bg-foreground/5"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
