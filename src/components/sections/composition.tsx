import type { LatestStats } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";

interface CompositionProps {
  latest: LatestStats;
}

const TOTAL_TILES = 128;
const COLS = 16;
const ROWS = 8;

export function Composition({ latest }: CompositionProps) {
  const { censorshipPct, totalBlocks } = latest;

  const censoringBlocks = Math.round((censorshipPct / 100) * totalBlocks);
  const neutralBlocks = totalBlocks - censoringBlocks;

  const censoringTiles = Math.round((censorshipPct / 100) * TOTAL_TILES);
  const neutralTiles = TOTAL_TILES - censoringTiles;

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
      {/* Tile grid — 16 cols × 8 rows = 128 tiles, the latest day at a glance */}
      <div className="relative border border-border-labrys bg-background p-5">
        {/* Watermark */}
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-auto opacity-[0.06] pointer-events-none z-0"
          viewBox="0 0 71 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.366815 8.68875L14.4011 16.7877L14.4019 41.0845L35.4519 53.219L35.4572 69.4075L0.365234 49.1722L0.366815 8.68875Z"
            className="fill-foreground"
          />
          <path
            opacity="0.7"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M70.542 8.689L56.507 16.7855V41.0845L35.457 53.219L35.4517 69.4076L70.5436 49.1722L70.542 8.689Z"
            className="fill-foreground"
          />
          <path
            opacity="0.5"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.367188 8.6887L14.4023 0.592438L35.4549 12.8731L56.5083 0.592438L70.5426 8.68893L35.4576 28.9533L0.367188 8.6887Z"
            className="fill-foreground"
          />
        </svg>

        {/* Grid */}
        <div
          className="relative z-10 grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          aria-label={`Block composition grid: ${censoringTiles} censoring tiles, ${neutralTiles} neutral tiles`}
        >
          {Array.from({ length: ROWS * COLS }).map((_, i) => {
            const isCensoring = i < censoringTiles;
            const col = i % COLS;
            const rowIndex = Math.floor(i / COLS);
            return (
              <div
                key={i}
                className={[
                  "tile aspect-square relative transition-transform duration-100 hover:scale-[1.4] hover:z-10 cursor-crosshair",
                  isCensoring ? "bg-ofac" : "bg-neutral-relay",
                ].join(" ")}
                style={{ "--delay": `${(rowIndex + col) * 15}ms` } as CSSVars}
                title={
                  isCensoring
                    ? `Tile ${i + 1}: censoring`
                    : `Tile ${i + 1}: neutral`
                }
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>

      {/* Legend + footnote */}
      <div className="flex items-center gap-5 flex-wrap border border-border-labrys border-t-0 px-5 py-[14px] font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted">
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
        <span className="ml-auto normal-case tracking-normal text-[10.5px] font-mono text-fg-muted">
          Each tile ≈ 1/128 of MEV-boost relay deliveries.
        </span>
      </div>

      {/* Block-count cards */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Censoring cell */}
        <div
          className="reveal-item border border-border-labrys p-[18px] bg-background transition-colors duration-200 hover:border-ofac"
          style={{ "--delay": "120ms" } as CSSVars}
        >
          <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
              aria-hidden="true"
            />
            Censoring relays
          </div>
          <div className="font-sans font-bold text-[42px] leading-none tracking-[-0.025em] text-foreground mt-3.5">
            <CountUp value={censoringBlocks} />
          </div>
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted mt-1.5">
            MEV-boost deliveries
          </div>
        </div>

        {/* Neutral cell */}
        <div
          className="reveal-item border border-border-labrys p-[18px] bg-background transition-colors duration-200 hover:border-neutral-relay"
          style={{ "--delay": "210ms" } as CSSVars}
        >
          <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 bg-neutral-relay"
              aria-hidden="true"
            />
            Neutral relays
          </div>
          <div className="font-sans font-bold text-[42px] leading-none tracking-[-0.025em] text-foreground mt-3.5">
            <CountUp value={neutralBlocks} />
          </div>
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted mt-1.5">
            MEV-boost deliveries
          </div>
        </div>
      </div>

      {/* Insight row — positive toned */}
      <div
        className="reveal-item mt-6 flex gap-5 items-start p-5 border border-good bg-good/10"
        style={{ "--delay": "300ms" } as CSSVars}
      >
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
