"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint, StatsSummary } from "@/lib/queries";
import { formatPercent, formatDateShort } from "@/lib/format";

interface TrendChartProps {
  trend: TrendPoint[];
  summary: StatsSummary;
}

type Range = "ALL" | "1Y" | "90D";

const RANGE_LABELS: Range[] = ["ALL", "1Y", "90D"];

function getSlice(trend: TrendPoint[], range: Range): TrendPoint[] {
  if (range === "ALL") return trend;
  const count = range === "1Y" ? 365 : 90;
  return trend.slice(-count);
}

/** Pick a sparse subset of indices for X-axis ticks — at most ~8 ticks. */
function sparseTickIndices(data: TrendPoint[], maxTicks = 8): string[] {
  if (data.length === 0) return [];
  const step = Math.max(1, Math.floor(data.length / maxTicks));
  const ticks: string[] = [];
  for (let i = 0; i < data.length; i += step) {
    ticks.push(data[i].date);
  }
  // Always include the last point
  const last = data[data.length - 1].date;
  if (!ticks.includes(last)) ticks.push(last);
  return ticks;
}

export function TrendChart({ trend, summary }: TrendChartProps) {
  const [range, setRange] = useState<Range>("ALL");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
  }, []);

  const data = useMemo(() => getSlice(trend, range), [trend, range]);
  const ticks = useMemo(() => sparseTickIndices(data), [data]);

  return (
    <section className="py-12 border-b border-border-labrys">
      {/* Section header */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
            04 / CENSORSHIP OVER TIME
          </div>
          <h2 className="font-sans font-bold text-[34px] leading-[1.05] tracking-[-0.02em] text-foreground m-0">
            Censorship % since
            <br />
            the Merge.
          </h2>
        </div>
        <div className="text-right font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted leading-relaxed">
          <span>7D ROLLING AVG</span>
          <br />
          <span>SEP 2022 — NOW</span>
        </div>
      </div>

      {/* Panel */}
      <div className="border border-border-labrys bg-panel">
        {/* Stat header row — ts-panel-head */}
        <div className="grid grid-cols-3 border-b border-border-labrys font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted">
          <div className="p-4 border-r border-border-labrys">
            NOW
            <strong className="block font-sans font-bold text-[22px] tracking-[-0.015em] text-warn mt-1.5 normal-case">
              {formatPercent(summary.current)}
            </strong>
          </div>
          <div className="p-4 border-r border-border-labrys">
            PEAK
            <strong className="block font-sans font-bold text-[22px] tracking-[-0.015em] text-warn mt-1.5 normal-case">
              {formatPercent(summary.peak)}
            </strong>
          </div>
          <div className="p-4">
            TROUGH
            <strong className="block font-sans font-bold text-[22px] tracking-[-0.015em] text-good mt-1.5 normal-case">
              {formatPercent(summary.trough)}
            </strong>
          </div>
        </div>

        {/* Range toggle + chart */}
        <div className="p-0">
          {/* Segment control toolbar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <div className="inline-flex border border-border-labrys">
              {RANGE_LABELS.map((r, i) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={[
                    "font-mono font-semibold text-[11px] tracking-[0.12em] uppercase px-4 py-2.5 border-0 cursor-pointer transition-colors",
                    i < RANGE_LABELS.length - 1 ? "border-r border-border-labrys" : "",
                    range === r
                      ? "bg-accent-brand text-panel"
                      : "bg-transparent text-fg-muted hover:text-foreground",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={range === r}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-[360px] px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent-color)"
                      stopOpacity={0.55}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-color)"
                      stopOpacity={0}
                    />
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
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border-labrys)",
                    borderRadius: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--foreground)",
                    letterSpacing: "0.08em",
                  }}
                  labelFormatter={(label) => formatDateShort(String(label))}
                  formatter={(value) => [
                    formatPercent(typeof value === "number" ? value : Number(value)),
                    "Censorship",
                  ]}
                  cursor={{ stroke: "var(--border-labrys)", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="censorshipPct"
                  stroke="var(--accent-color)"
                  strokeWidth={2}
                  fill="url(#accentGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: "var(--foreground)",
                    strokeWidth: 1.5,
                    fill: "var(--accent-color)",
                  }}
                  isAnimationActive={!reduceMotion}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
