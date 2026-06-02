"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint } from "@/lib/queries";
import { toCompositionPoint, type CompositionPoint } from "@/lib/composition";
import { formatPercent, formatDateShort, formatDateLong } from "@/lib/format";
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

/** Date row for the NOW/PEAK/TROUGH cells. Drops the weekday prefix on
 *  mobile so the date stays on one line inside a third-of-width cell. */
function StatDate({ iso }: { iso: string }) {
  const long = formatDateLong(iso);
  const sep = long.indexOf(" · ");
  const weekday = sep > -1 ? long.slice(0, sep) : "";
  const rest = sep > -1 ? long.slice(sep + 3) : long;
  return (
    <div className="mt-1 text-[9px] tracking-[0.08em] text-fg-muted normal-case">
      <span className="hidden sm:inline">{weekday} · </span>
      {rest}
    </div>
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
      <div className="text-fg-muted mb-2">{formatDateLong(String(label))}</div>
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
        <LegendSwatch className="bg-neutral-relay" label="Non-censored" />
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
  // Recharts replays the left-to-right wipe whenever `data` changes. The
  // long 1100ms wipe reads as a glitch on a click-driven range swap (the
  // chart appears to snap to width 0 and grow), so we shorten the duration
  // after the first interaction. Initial scroll-into-view still gets the
  // slow elegant reveal.
  const [hasInteracted, setHasInteracted] = useState(false);
  const handleRangeChange = (next: Range) => {
    setHasInteracted(true);
    setRange(next);
  };
  const animateAreas = !reduceMotion;
  const areaAnimationDuration = hasInteracted ? 400 : 1100;

  // Sliding underline indicator for the range tabs. Measured from the active
  // button so labels can be any width; null until first measure to avoid a
  // flash at (0,0) on hydrate.
  const rangeBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(
    null,
  );
  useEffect(() => {
    const activeIdx = RANGE_LABELS.indexOf(range);
    const btn = rangeBtnRefs.current[activeIdx];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [range]);

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

  const slice = useMemo(() => getSlice(trend, range), [trend, range]);
  const data = useMemo<CompositionPoint[]>(
    () => slice.map(toCompositionPoint),
    [slice],
  );
  // Recompute headline stats from whatever range is selected so NOW / PEAK /
  // TROUGH reflect the visible window, not the full series. Inlined (rather
  // than importing `summarise` from `@/lib/queries`) so this client component
  // doesn't pull the server-only db layer into the browser bundle. We track
  // the date alongside each value so the header can show *when* each point
  // landed, not just the number.
  const rangeStats = useMemo(() => {
    if (slice.length === 0) {
      return {
        current: 0,
        currentDate: null as string | null,
        peak: 0,
        peakDate: null as string | null,
        trough: 0,
        troughDate: null as string | null,
      };
    }
    let peakIdx = 0;
    let troughIdx = 0;
    for (let i = 1; i < slice.length; i++) {
      if (slice[i].censorshipPct > slice[peakIdx].censorshipPct) peakIdx = i;
      if (slice[i].censorshipPct < slice[troughIdx].censorshipPct) troughIdx = i;
    }
    const last = slice.length - 1;
    return {
      current: slice[last].censorshipPct,
      currentDate: slice[last].date,
      peak: slice[peakIdx].censorshipPct,
      peakDate: slice[peakIdx].date,
      trough: slice[troughIdx].censorshipPct,
      troughDate: slice[troughIdx].date,
    };
  }, [slice]);
  const ticks = useMemo(
    () => sparseTickIndices(data, isNarrow ? 3 : 8),
    [data, isNarrow],
  );

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
        {/* Stat header — one continuous block. Title row sits directly
            above the stat row (no internal divider) so the denominator
            and the numbers feel like one unit. Each stat inlines its
            label beside its value to remove the dead space that a wide
            stacked layout would create on the right of each cell. */}
        <div className="border-b border-border-labrys">
          <div className="px-3 pt-2.5 pb-1 flex items-baseline gap-2 font-mono text-[10px] tracking-[0.12em] uppercase">
            <span className="text-foreground font-semibold">Censorship %</span>
            <span className="text-fg-muted" aria-hidden="true">·</span>
            <span className="text-fg-muted">Of MEV-boost payloads</span>
          </div>
          <div className="grid grid-cols-3 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
            <div className="px-2 sm:px-3 pt-1 pb-2 border-r border-border-labrys transition-colors duration-200 hover:bg-panel-alt">
              <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span>NOW</span>
                <strong className="font-sans font-bold text-[15px] sm:text-[18px] leading-none tracking-[-0.015em] text-foreground normal-case">
                  <CountUp value={rangeStats.current} decimals={1} suffix="%" />
                </strong>
              </div>
              {rangeStats.currentDate && <StatDate iso={rangeStats.currentDate} />}
            </div>
            <div className="px-2 sm:px-3 pt-1 pb-2 border-r border-border-labrys transition-colors duration-200 hover:bg-panel-alt">
              <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span>PEAK</span>
                <strong className="font-sans font-bold text-[15px] sm:text-[18px] leading-none tracking-[-0.015em] text-warn normal-case">
                  <CountUp value={rangeStats.peak} decimals={1} suffix="%" />
                </strong>
              </div>
              {rangeStats.peakDate && <StatDate iso={rangeStats.peakDate} />}
            </div>
            <div className="px-2 sm:px-3 pt-1 pb-2 transition-colors duration-200 hover:bg-panel-alt">
              <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span>TROUGH</span>
                <strong className="font-sans font-bold text-[15px] sm:text-[18px] leading-none tracking-[-0.015em] text-good normal-case">
                  <CountUp value={rangeStats.trough} decimals={1} suffix="%" />
                </strong>
              </div>
              {rangeStats.troughDate && <StatDate iso={rangeStats.troughDate} />}
            </div>
          </div>
        </div>

        {/* Range toggle + legend + chart */}
        <div className="p-0">
          <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-0 sm:flex-row sm:flex-wrap sm:justify-between">
            {/* Range tabs — sliding brand-accent underline tracks the
                active button. Hairline rail below keeps the inactive labels
                anchored visually without boxing the whole control. */}
            <div
              className="relative inline-flex border-b border-border-labrys"
              role="tablist"
              aria-label="Time range"
            >
              {RANGE_LABELS.map((r, i) => (
                <button
                  key={r}
                  ref={(el) => {
                    rangeBtnRefs.current[i] = el;
                  }}
                  onClick={() => handleRangeChange(r)}
                  role="tab"
                  aria-selected={range === r}
                  className={[
                    "font-mono font-semibold text-[10.5px] tracking-[0.12em] uppercase px-3.5 py-2 border-0 bg-transparent cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand focus-visible:ring-inset",
                    range === r
                      ? "text-foreground"
                      : "text-fg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {r}
                </button>
              ))}
              {indicator && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-px h-[2px] bg-accent-brand transition-[left,width] duration-300 ease-out"
                  style={{ left: indicator.left, width: indicator.width }}
                />
              )}
            </div>
            {/* Legend — labels & order mirror the composition/epoch ledger
                key so a reader sees the same names across both sections. */}
            <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted sm:justify-end">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
                  aria-hidden="true"
                />
                <span className="sm:hidden">Censoring</span>
                <span className="hidden sm:inline">OFAC Censoring</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 shrink-0 bg-neutral-relay"
                  aria-hidden="true"
                />
                Neutral
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 shrink-0 bg-non-boost"
                  aria-hidden="true"
                />
                <span className="sm:hidden">Unknown</span>
                <span className="hidden sm:inline">Relay Unknown / Non-MEV-Boost</span>
              </span>
            </div>
          </div>

          {/* Chart */}
          <div
            ref={chartRef}
            className="relative w-full h-[260px] sm:h-[300px] px-2 pt-4 pb-2"
          >
            {data.length === 0 && (
              <div
                aria-live="polite"
                className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted"
              >
                Awaiting first daily snapshot
              </div>
            )}
            {inView ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
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
                  {/* Declared bottom-to-top: non-censored, censored, non-boosted */}
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
                    isAnimationActive={animateAreas}
                    animationDuration={areaAnimationDuration}
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
                    isAnimationActive={animateAreas}
                    animationDuration={areaAnimationDuration}
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
                    isAnimationActive={animateAreas}
                    animationDuration={areaAnimationDuration}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                className="h-full w-full animate-pulse bg-foreground/5"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
