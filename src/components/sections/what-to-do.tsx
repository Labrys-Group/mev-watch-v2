import { Section } from "@/components/section";
import type { CSSVars } from "@/lib/css";

const STEPS = [
  {
    n: "01.",
    title: "Open your mev-boost config",
    body: "Locate the --relays argument in your validator client or mev-boost service file.",
  },
  {
    n: "02.",
    title: "Remove OFAC-compliant relays",
    body: "Drop Flashbots, bloXroute Max Profit, and bloXroute Regulated from the list.",
  },
  {
    n: "03.",
    title: "Add neutral relays",
    body: "Ultra Sound, Aestus, Agnostic, and Titan relay — all censorship-free.",
  },
  {
    n: "04.",
    title: "Restart and verify",
    body: "Confirm your relay list is correct after restarting the mev-boost process.",
  },
] as const;

export function WhatToDo() {
  return (
    <Section
      label="05 / WHAT TO DO"
      title="Keep Ethereum credibly neutral."
      aside="FOR: VALIDATORS, STAKERS, BUILDERS"
      pattern="arcs"
      accent="var(--good)"
    >
      {/* Callout panel */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] border border-border-labrys overflow-hidden">
        {/* Left side — hero-styled callout with warn-tinted wash + faded grid */}
        <div className="relative overflow-hidden p-5 md:p-7 border-b border-border-labrys md:border-b-0 md:border-r md:border-border-labrys bg-panel flex flex-col justify-center">
          {/* Warn-tinted radial wash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(115% 125% at 0% 0%, color-mix(in oklch, var(--warn) 14%, transparent) 0%, transparent 58%)",
            }}
          />
          {/* Faded grid background texture */}
          <div aria-hidden="true" className="faded-grid pointer-events-none absolute inset-0" />

          <div className="relative">
            <h3 className="font-sans font-bold text-[24px] sm:text-[30px] leading-none tracking-[-0.025em] text-foreground m-0">
              <span className="text-warn font-mono font-semibold">BAD</span>
              <span className="text-fg-muted mx-1.5">&nbsp;==&nbsp;</span>
              <span className="text-warn font-mono font-semibold">CENSORSHIP</span>
            </h3>
            <p className="font-mono text-[12.5px] leading-[1.6] text-fg-muted mt-3.5">
              Adopt a non-censoring MEV-Boost relay. The cost to you is zero. The
              cost to Ethereum of doing nothing is{" "}
              <strong className="text-foreground font-semibold">
                the right to transact.
              </strong>
            </p>
          </div>
        </div>

        {/* Right side — validator steps */}
        <div className="p-5 md:p-7 flex flex-col justify-center bg-panel-alt">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="reveal-item group flex gap-3 py-2.5 border-b border-border-labrys last:border-b-0 font-mono text-[12.5px] items-start"
              style={{ "--delay": `${i * 90}ms` } as CSSVars}
            >
              <span className="font-mono text-[10.5px] text-accent-alt tracking-[0.1em] w-7 shrink-0 pt-[1px] transition-transform duration-200 group-hover:translate-x-0.5">
                {step.n}
              </span>
              <span className="text-fg-muted leading-[1.55]">
                <strong className="font-sans font-bold text-foreground">
                  {step.title}.
                </strong>{" "}
                {step.body}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
