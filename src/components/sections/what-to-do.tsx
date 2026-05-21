import { Section } from "@/components/section";
import { ShareStrip } from "./share-strip";

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
      label="04 / WHAT TO DO"
      title={
        <>
          Keep Ethereum
          <br />
          credibly neutral.
        </>
      }
      aside="FOR: VALIDATORS, STAKERS, BUILDERS"
    >
      {/* Callout panel */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] border border-border-labrys overflow-hidden">
        {/* Left side */}
        <div className="p-10 border-b border-border-labrys md:border-b-0 md:border-r md:border-border-labrys bg-background">
          <h3 className="font-sans font-bold text-[42px] leading-none tracking-[-0.025em] text-foreground m-0">
            <span className="text-warn font-mono font-semibold">BAD</span>
            <span className="text-fg-muted mx-1.5">&nbsp;==&nbsp;</span>
            <span className="text-warn font-mono font-semibold">CENSORSHIP</span>
          </h3>
          <p className="font-mono text-[13px] leading-[1.6] text-fg-muted mt-[18px]">
            Adopt a non-censoring MEV-Boost relay. The cost to you is zero. The
            cost to Ethereum of doing nothing is{" "}
            <strong className="text-foreground font-semibold">
              the right to transact.
            </strong>
          </p>

          <ShareStrip />
        </div>

        {/* Right side — validator steps */}
        <div className="p-10 flex flex-col justify-center bg-panel-alt">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="flex gap-3.5 py-3.5 border-b border-border-labrys last:border-b-0 font-mono text-[13px] items-start"
            >
              <span className="font-mono text-[11px] text-accent-alt tracking-[0.1em] w-8 shrink-0 pt-[1px]">
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
