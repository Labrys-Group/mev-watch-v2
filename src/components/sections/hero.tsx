import { formatPercent } from "@/lib/format";
import { CountUp } from "@/components/count-up";
import type { CSSVars } from "@/lib/css";
import type { StatsSummary } from "@/lib/queries";

interface HeroProps {
  summary: StatsSummary;
}

export function Hero({ summary }: HeroProps) {
  const drop = (summary.peak - summary.current).toFixed(1);

  const isFalling = summary.current <= summary.peak - 5;
  const trendWord = isFalling ? "FALLING" : "HIGH";
  const trendColor = isFalling ? "text-good" : "text-warn";
  const trendGlow = isFalling ? "glow-good" : "glow-warn";

  return (
    <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8">
      {/* Verdict-tinted wash — a faint colour cue for the current trend */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 125% at 0% 0%, color-mix(in oklch, ${
            isFalling ? "var(--good)" : "var(--warn)"
          } 14%, transparent) 0%, transparent 58%)`,
        }}
      />
      {/* Faded grid background texture */}
      <div aria-hidden="true" className="faded-grid pointer-events-none absolute inset-0" />

      {/* Hero content — layered above grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-end">
        {/* Left column — headline & stat */}
        <div>
          {/* Tag line */}
          <div
            className="anim-fade-up inline-flex items-center gap-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-accent-brand mb-4"
            style={{ "--delay": "80ms" } as CSSVars}
          >
            <span aria-hidden="true">{"// "}</span>
            PUBLIC TRANSPARENCY TOOL
          </div>

          {/* Display headline — masked line-by-line rise */}
          <h1
            className="font-sans font-extrabold leading-[0.95] tracking-[-0.035em] m-0 text-foreground"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
          >
            <span className="line-mask block">
              <span className="line-rise" style={{ "--delay": "160ms" } as CSSVars}>
                CENSORSHIP
              </span>
            </span>
            <span className="line-mask block">
              <span className="line-rise" style={{ "--delay": "260ms" } as CSSVars}>
                IS
              </span>
            </span>
            <span className="line-mask block">
              <span
                className={`line-rise ${trendColor} ${trendGlow}`}
                style={{ "--delay": "360ms" } as CSSVars}
              >
                {trendWord}
              </span>
            </span>
          </h1>

          {/* Stat line */}
          <div
            className="anim-fade-up mt-5 font-mono text-[13px] tracking-[0.04em] leading-snug text-fg-muted"
            style={{ "--delay": "540ms" } as CSSVars}
          >
            <span
              className="font-sans font-extrabold tracking-tight text-foreground"
              style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.1rem)" }}
            >
              <CountUp value={summary.current} decimals={1} suffix="%" />
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
        <div
          className="anim-fade-up relative font-mono text-[12.5px] leading-[1.65] text-fg-muted max-w-sm lg:max-w-none p-4 border border-border-labrys bg-panel"
          style={{ "--delay": "660ms" } as CSSVars}
        >
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
            <span
              aria-hidden="true"
              className="cursor-blink ml-1 inline-block h-[1.05em] w-[7px] translate-y-[0.2em] bg-accent-brand align-baseline"
            />
          </p>
        </div>
      </div>
    </section>
  );
}
