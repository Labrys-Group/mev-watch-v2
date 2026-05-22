import type { LatestStats } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";
import { EpochLedger } from "@/components/sections/epoch-ledger";
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";

interface CompositionProps {
  latest: LatestStats;
}

export async function Composition({ latest }: CompositionProps) {
  const { censorshipPct, totalBlocks } = latest;
  const ledger = await getLiveEpochs();

  const censoringBlocks = Math.round((censorshipPct / 100) * totalBlocks);
  const neutralBlocks = totalBlocks - censoringBlocks;

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
      {/* Live epoch ledger — the latest 4 epochs of real per-slot data */}
      <EpochLedger initial={ledger} />

      {/* Legend + footnote */}
      <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap border border-border-labrys border-t-0 px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
            aria-hidden="true"
          />
          OFAC Censoring
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
          Non-MEV-Boost
        </span>
        <span className="ml-auto normal-case tracking-normal text-[10px] font-mono text-fg-muted">
          Each tile is one real slot · latest 4 epochs, live. Hover a tile for
          detail.
        </span>
      </div>

      {/* Block-count cards */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {/* Censoring cell */}
        <div
          className="reveal-item border border-border-labrys p-3.5 bg-background transition-colors duration-200 hover:border-ofac"
          style={{ "--delay": "120ms" } as CSSVars}
        >
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
              aria-hidden="true"
            />
            Censoring relays
          </div>
          <div className="font-sans font-bold text-[28px] sm:text-[30px] leading-none tracking-[-0.025em] text-foreground mt-2.5">
            <CountUp value={censoringBlocks} />
          </div>
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted mt-1.5">
            MEV-boost deliveries
          </div>
        </div>

        {/* Neutral cell */}
        <div
          className="reveal-item border border-border-labrys p-3.5 bg-background transition-colors duration-200 hover:border-neutral-relay"
          style={{ "--delay": "210ms" } as CSSVars}
        >
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-neutral-relay"
              aria-hidden="true"
            />
            Neutral relays
          </div>
          <div className="font-sans font-bold text-[28px] sm:text-[30px] leading-none tracking-[-0.025em] text-foreground mt-2.5">
            <CountUp value={neutralBlocks} />
          </div>
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted mt-1.5">
            MEV-boost deliveries
          </div>
        </div>
      </div>

      {/* Insight row — positive toned */}
      <div
        className="reveal-item mt-5 flex gap-3.5 items-start p-4 border border-good bg-good/10"
        style={{ "--delay": "300ms" } as CSSVars}
      >
        <div className="font-mono text-good text-base tracking-[0.05em] leading-none shrink-0">
          [+]
        </div>
        <div className="font-mono text-[12.5px] leading-[1.55] text-fg-muted">
          <strong className="text-good font-semibold">
            Resistance is winning
          </strong>{" "}
          — neutral relays now deliver the majority of MEV-boost blocks.
        </div>
      </div>
    </Section>
  );
}
