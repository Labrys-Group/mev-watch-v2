import { formatPercent } from "@/lib/format";
import type { StatsSummary } from "@/lib/queries";

interface HeroProps {
  summary: StatsSummary;
}

export function Hero({ summary }: HeroProps) {
  const drop = (summary.peak - summary.current).toFixed(1);

  const trendWord = summary.current <= summary.peak - 5 ? "FALLING" : "HIGH";
  const trendColor = summary.current <= summary.peak - 5 ? "text-good" : "text-warn";

  return (
    <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-6 md:p-10">
      {/* Faded grid background texture */}
      <div aria-hidden="true" className="faded-grid pointer-events-none absolute inset-0" />

      {/* Hero content — layered above grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-8 items-end">
        {/* Left column — headline & stat */}
        <div>
          {/* Tag line */}
          <div className="inline-flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-accent-brand mb-6">
            <span aria-hidden="true">{"// "}</span>
            PUBLIC TRANSPARENCY TOOL
          </div>

          {/* Display headline */}
          <h1
            className="font-sans font-extrabold leading-[0.95] tracking-[-0.035em] m-0 text-foreground"
            style={{ fontSize: "clamp(3rem, 8vw, 5rem)" }}
          >
            CENSORSHIP
            <br />
            IS
            <br />
            <span className={trendColor}>{trendWord}</span>
          </h1>

          {/* Stat line */}
          <div className="mt-6 font-mono text-sm tracking-[0.04em] leading-snug text-fg-muted">
            <span
              className="font-sans font-extrabold tracking-tight text-foreground"
              style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)" }}
            >
              {formatPercent(summary.current)}
            </span>{" "}
            <span className="text-good font-semibold">▼</span>{" "}
            <span>
              down {drop} pts from a{" "}
              <span className="text-foreground font-semibold">
                {formatPercent(summary.peak)}
              </span>{" "}
              peak
            </span>
          </div>
        </div>

        {/* Right column — terminal lede box */}
        <div className="relative font-mono text-[13px] leading-[1.65] text-fg-muted max-w-sm lg:max-w-none p-5 border border-border-labrys bg-panel">
          {/* $ cat ./readme.md label */}
          <span
            className="absolute -top-[9px] left-3.5 px-2 bg-background font-mono text-[10px] tracking-[0.1em] text-accent-brand"
            aria-hidden="true"
          >
            $ cat ./readme.md
          </span>

          <p className="m-0">
            Some MEV-Boost relays filter OFAC-sanctioned transactions.{" "}
            <strong className="text-foreground font-semibold">
              MEV Watch tracks how much of Ethereum&apos;s block flow still passes
              through them
            </strong>{" "}
            — and shows that share falling over time.
          </p>
        </div>
      </div>
    </section>
  );
}
