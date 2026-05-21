import { formatPercent } from "@/lib/format";
import type { LatestStats } from "@/lib/queries";
import { Section } from "@/components/section";

interface CompositionProps {
  latest: LatestStats;
}

export function Composition({ latest }: CompositionProps) {
  const { censorshipPct, neutralPct, totalBlocks } = latest;

  return (
    <Section
      label="01 / POST-MERGE COMPOSITION"
      title={
        <>
          Censoring vs. <br /> neutral relays.
        </>
      }
      aside={
        <>
          <span>DISTRIBUTION OF MEV-BOOST BLOCKS</span>
          <br />
          <span>
            N&nbsp;={" "}
            <strong className="text-foreground font-semibold tracking-normal normal-case">
              {totalBlocks.toLocaleString()} BLOCKS
            </strong>
          </span>
        </>
      }
    >
      {/* Panel header */}
      <div className="flex justify-between font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted mb-[18px]">
        <span>OFAC POSTURE BREAKDOWN</span>
        <span>
          N&nbsp;={" "}
          <strong className="text-foreground font-semibold tracking-normal normal-case">
            {totalBlocks.toLocaleString()} BLOCKS
          </strong>
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-12 border border-border-labrys overflow-hidden">
        {/* Censoring segment */}
        <div
          className="relative flex items-center justify-center font-mono text-sm font-semibold bg-ofac text-ofac-fg border-r border-border-labrys shrink-0"
          style={{ width: `${censorshipPct}%` }}
          title={`Censoring: ${formatPercent(censorshipPct)}`}
        >
          <span className="truncate px-1">{formatPercent(censorshipPct)}</span>
        </div>

        {/* Neutral segment */}
        <div
          className="relative flex items-center justify-center font-mono text-sm font-semibold bg-neutral-relay text-neutral-relay-fg grow"
          style={{ width: `${neutralPct}%` }}
          title={`Neutral: ${formatPercent(neutralPct)}`}
        >
          <span className="truncate px-1">{formatPercent(neutralPct)}</span>
        </div>
      </div>

      {/* Axis labels */}
      <div className="flex justify-between font-mono text-[10px] tracking-[0.12em] text-fg-muted mt-2">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>

      {/* Legend grid — 2 cells */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Censoring cell */}
        <div className="border border-border-labrys p-[18px] bg-background">
          <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
              aria-hidden="true"
            />
            Censoring relays
          </div>
          <div className="font-sans font-bold text-[42px] leading-none tracking-[-0.025em] text-foreground mt-3.5">
            {formatPercent(censorshipPct)}
          </div>
        </div>

        {/* Neutral cell */}
        <div className="border border-border-labrys p-[18px] bg-background">
          <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-neutral-relay"
              aria-hidden="true"
            />
            Neutral relays
          </div>
          <div className="font-sans font-bold text-[42px] leading-none tracking-[-0.025em] text-foreground mt-3.5">
            {formatPercent(neutralPct)}
          </div>
        </div>
      </div>

      {/* Insight row — mint/positive toned */}
      <div className="mt-6 flex gap-5 items-start p-5 border border-good bg-good/10">
        <div className="font-mono text-good text-lg tracking-[0.05em] leading-none shrink-0">
          [+]
        </div>
        <div className="font-mono text-[13px] leading-[1.55] text-fg-muted">
          <strong className="text-good font-semibold">
            Resistance is winning
          </strong>{" "}
          — neutral relays now deliver the majority of MEV-boost blocks.
        </div>
      </div>
    </Section>
  );
}
