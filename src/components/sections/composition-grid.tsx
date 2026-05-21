import type { LatestStats } from "@/lib/queries";
import { Section } from "@/components/section";

interface CompositionGridProps {
  latest: LatestStats;
}

const TOTAL_TILES = 128;
const COLS = 16;
const ROWS = 8;

export function CompositionGrid({ latest }: CompositionGridProps) {
  const { date, censorshipPct, neutralPct, totalBlocks } = latest;

  const censoringTiles = Math.round((censorshipPct / 100) * TOTAL_TILES);
  const neutralTiles = TOTAL_TILES - censoringTiles;

  return (
    <Section
      label="06 / BLOCK COMPOSITION"
      title="How the latest day breaks down."
      aside={
        <>
          <span>CENSORING VS NEUTRAL RATIO</span>
          <br />
          <span>{date}</span>
        </>
      }
    >
      {/* Stats header bar — mirrors mockup's .blocks-head */}
      <div className="grid grid-cols-4 border border-border-labrys border-b-0 font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted">
        <div className="p-[14px] border-r border-border-labrys">
          <span>EACH TILE</span>
          <strong className="block font-sans font-bold text-[18px] tracking-[-0.01em] text-foreground mt-1 normal-case">
            ~1/128
          </strong>
        </div>
        <div className="p-[14px] border-r border-border-labrys">
          <span>TOTAL BLOCKS</span>
          <strong className="block font-sans font-bold text-[18px] tracking-[-0.01em] text-foreground mt-1 normal-case">
            {totalBlocks.toLocaleString()}
          </strong>
        </div>
        <div className="p-[14px] border-r border-border-labrys">
          <span>OFAC CENSORING</span>
          <strong className="block font-sans font-bold text-[18px] tracking-[-0.01em] text-ofac mt-1 normal-case">
            {censoringTiles} / {censorshipPct.toFixed(1)}%
          </strong>
        </div>
        <div className="p-[14px]">
          <span>NEUTRAL</span>
          <strong className="block font-sans font-bold text-[18px] tracking-[-0.01em] text-neutral-relay mt-1 normal-case">
            {neutralTiles} / {neutralPct.toFixed(1)}%
          </strong>
        </div>
      </div>

      {/* Tile grid — 16 cols × 8 rows = 128 tiles */}
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
            return (
              <div
                key={i}
                className={[
                  "aspect-square",
                  isCensoring
                    ? "bg-ofac"
                    : "bg-neutral-relay",
                ].join(" ")}
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

      {/* Footer — legend + footnote */}
      <div className="flex items-center gap-5 flex-wrap border border-border-labrys border-t-0 px-5 py-[14px] font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted">
        {/* Censoring swatch */}
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 shrink-0 bg-ofac"
            aria-hidden="true"
          />
          OFAC Censoring
        </span>

        {/* Neutral swatch */}
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 shrink-0 bg-neutral-relay"
            aria-hidden="true"
          />
          Neutral
        </span>

        {/* Footnote pushed right */}
        <span className="ml-auto normal-case tracking-normal text-[10.5px] font-mono text-fg-muted">
          Each tile ≈ 1/128 of MEV-boost relay deliveries.
          A live per-block stream is planned.
        </span>
      </div>
    </Section>
  );
}
