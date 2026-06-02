import type { LatestStats } from "@/lib/queries";
import type { LedgerData } from "@/lib/live-ledger/types";
import type { DataFreshness } from "@/lib/data-freshness";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";
import { EpochLedger } from "@/components/sections/epoch-ledger";

interface CompositionProps {
  latest: LatestStats;
  ledger: LedgerData;
  // freshness is passed by the data wrapper and kept here for API stability,
  // but the restored 37aefe1 layout does not surface it in the JSX.
  freshness: DataFreshness;
}

export function Composition({
  latest,
  ledger,
  freshness: _freshness,
}: CompositionProps) {
  const { censorshipPct, totalBlocks } = latest;

  const censoringBlocks = Math.round((censorshipPct / 100) * totalBlocks);
  const neutralBlocks = totalBlocks - censoringBlocks;

  return (
    <Section
      label="01 / POST-MERGE COMPOSITION"
      title="Censoring vs. neutral relays."
      pattern="line-grid"
      accent="var(--accent-alt-color)"
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
      {/* Live epoch ledger — the latest 4 epochs of real per-slot data */}
      <EpochLedger initial={ledger} />

      {/* Legend + footnote. On mobile we collapse the long labels and force
          the tag onto its own line so the strip is 2 lines, not 4. */}
      <div className="flex items-center gap-x-3 sm:gap-x-4 gap-y-1 flex-wrap border border-border-labrys border-t-0 px-3 sm:px-4 py-2 sm:py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
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
        {/* basis-full breaks the tag to its own line on mobile; sm: flips it
            back inline and right-aligned. */}
        <span className="basis-full sm:basis-auto sm:ml-auto normal-case tracking-normal text-[10px] font-mono text-fg-muted">
          Each tile is one real slot
          <span className="hidden sm:inline">
            {" "}· latest 4 epochs, live.
          </span>
          <span className="sm:hidden">.</span>
          {/* Hover hint only on devices that can actually hover; touch
              devices no longer wire up tap-to-detail. */}
          <span className="hidden [@media(hover:hover)]:inline">
            {" "}
            Hover a tile for detail.
          </span>
        </span>
      </div>

      {/* Block-count cards */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {/* Censoring cell */}
        <div
          className="reveal-item border border-border-labrys p-3 sm:p-3.5 bg-background transition-colors duration-200 hover:border-ofac"
          style={{ "--delay": "120ms" } as CSSVars}
        >
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] sm:tracking-[0.14em] uppercase text-fg-muted whitespace-nowrap">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
              aria-hidden="true"
            />
            Censoring relays
          </div>
          <div className="font-sans font-bold text-[22px] sm:text-[30px] leading-none tracking-[-0.025em] text-foreground mt-2.5">
            <CountUp value={censoringBlocks} />
          </div>
          <div className="hidden sm:block font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted mt-1.5">
            MEV-boost deliveries
          </div>
        </div>

        {/* Neutral cell */}
        <div
          className="reveal-item border border-border-labrys p-3 sm:p-3.5 bg-background transition-colors duration-200 hover:border-neutral-relay"
          style={{ "--delay": "210ms" } as CSSVars}
        >
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] sm:tracking-[0.14em] uppercase text-fg-muted whitespace-nowrap">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-neutral-relay"
              aria-hidden="true"
            />
            Neutral relays
          </div>
          <div className="font-sans font-bold text-[22px] sm:text-[30px] leading-none tracking-[-0.025em] text-foreground mt-2.5">
            <CountUp value={neutralBlocks} />
          </div>
          <div className="hidden sm:block font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted mt-1.5">
            MEV-boost deliveries
          </div>
        </div>
      </div>
    </Section>
  );
}
