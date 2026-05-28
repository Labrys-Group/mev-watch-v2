import { CountUp } from "@/components/count-up";
import type { CSSVars } from "@/lib/css";
import type { HeroVerdict } from "@/lib/hero-verdict";
import type { DataFreshness } from "@/lib/data-freshness";

interface HeroProps {
  verdict: HeroVerdict;
  freshness: DataFreshness;
}

export function Hero({ verdict }: HeroProps) {
  const isGood = verdict.tone === "good";
  const trendWord = verdict.headlineWord;
  const trendColor = isGood ? "text-good" : "text-warn";
  const trendGlow = isGood ? "glow-good" : "glow-warn";
  const trendBorder = isGood ? "border-good" : "border-warn";

  return (
    <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8">
      {/* Verdict-tinted wash — a faint colour cue for the current trend */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 125% at 0% 0%, color-mix(in oklch, ${
            isGood ? "var(--good)" : "var(--warn)"
          } 14%, transparent) 0%, transparent 58%)`,
        }}
      />
      {/* Faded grid background texture */}
      <div aria-hidden="true" className="faded-grid pointer-events-none absolute inset-0" />

      {/* Hero content — layered above grid */}
      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        {/* Left column — tag line + headline */}
        <div>
          {/* Tag line */}
          <div
            className="anim-fade-up inline-flex items-center gap-2.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-accent-brand mb-4"
            style={{ "--delay": "80ms" } as CSSVars}
          >
            <span aria-hidden="true">{"// "}</span>
            PUBLIC TRANSPARENCY TOOL
          </div>

          {/* Display headline — "CENSORSHIP IS" on one line, trend word below */}
          <h1
            className="font-sans font-extrabold leading-[0.95] tracking-[-0.035em] m-0 text-foreground"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)" }}
          >
            <span className="line-mask block">
              <span className="line-rise" style={{ "--delay": "160ms" } as CSSVars}>
                CENSORSHIP IS
              </span>
            </span>
            <span className="line-mask block">
              <span
                className={`line-rise ${trendColor} ${trendGlow}`}
                style={{ "--delay": "260ms" } as CSSVars}
              >
                {trendWord}
              </span>
            </span>
          </h1>
        </div>

        {/* Right column — % stat (top), readme callout anchored to the bottom
            so the headline and the readme share a baseline at lg widths. */}
        <div className="flex h-full flex-col gap-5">
          {/* Stat card — 2px verdict-coloured border, no label. The colour
              of the frame carries the trend reading; the figure speaks for
              itself without a terminal-label introduction. */}
          <div
            className={`anim-fade-up flex items-center gap-x-4 p-4 border-2 bg-panel font-mono text-[13px] tracking-[0.04em] leading-snug text-fg-muted ${trendBorder}`}
            style={{ "--delay": "360ms" } as CSSVars}
          >
            <div className="flex shrink-0 items-baseline gap-2">
              <span
                className="font-sans font-extrabold tracking-tight text-foreground"
                style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.1rem)" }}
              >
                <CountUp value={verdict.current} decimals={1} suffix="%" />
              </span>
              <span
                className={`font-sans font-extrabold tracking-tight ${trendColor}`}
                style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.1rem)" }}
              >
                {verdict.arrow}
              </span>
            </div>
            <p className="m-0 min-w-0 flex-1">{verdict.message}</p>
          </div>

          {/* Readme terminal lede box — mt-auto pushes it to the bottom of
              the column when the grid stretches, giving the stat card breathing
              room above it on lg viewports. */}
          <div
            className="anim-fade-up relative mt-auto font-mono text-[12.5px] leading-[1.65] text-fg-muted p-4 border border-border-labrys bg-panel"
            style={{ "--delay": "540ms" } as CSSVars}
          >
            {/* $ cat ./readme.md label */}
            <span
              className="absolute -top-[9px] left-3.5 px-2 bg-background font-mono text-[10px] font-semibold tracking-[0.1em] text-accent-brand"
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
      </div>
    </section>
  );
}
