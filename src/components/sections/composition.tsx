import type { LatestStats } from "@/lib/queries";
import type { LedgerData } from "@/lib/live-ledger/types";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";
import { EpochLedger } from "@/components/sections/epoch-ledger";

interface CompositionProps {
  latest: LatestStats;
  ledger: LedgerData;
}

export function Composition({ latest, ledger }: CompositionProps) {
  const { censorshipPct, neutralPct, nonBoostPct, totalBlocks } = latest;
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
          <span>DAILY MEV-BOOST DELIVERY DISTRIBUTION</span>
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
      <EpochLedger initial={ledger} />

      <div className="grid grid-cols-1 border border-border-labrys bg-background sm:grid-cols-3">
        <CompositionBand
          label="OFAC Censoring"
          value={censorshipPct}
          swatch="bg-ofac"
          delay="80ms"
        />
        <CompositionBand
          label="Neutral + unknown"
          value={neutralPct}
          swatch="bg-neutral-relay"
          delay="140ms"
        />
        <CompositionBand
          label="Non-MEV-Boost"
          value={nonBoostPct}
          swatch="bg-non-boost"
          delay="200ms"
        />
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
    </Section>
  );
}

interface CompositionBandProps {
  label: string;
  value: number;
  swatch: string;
  delay: string;
}

function CompositionBand({ label, value, swatch, delay }: CompositionBandProps) {
  return (
    <div
      className="reveal-item border-b border-border-labrys p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
      style={{ "--delay": delay } as CSSVars}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted">
        <span className={`inline-block h-2.5 w-2.5 shrink-0 ${swatch}`} />
        {label}
      </div>
      <div className="mt-2 font-sans text-[30px] font-bold leading-none tracking-[-0.025em] text-foreground">
        <CountUp value={value} decimals={1} suffix="%" />
      </div>
    </div>
  );
}
