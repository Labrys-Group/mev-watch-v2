const TWEET_TEXT = encodeURIComponent(
  "Protocol-level censorship is bad. Keep Ethereum credibly neutral — switch to non-censoring MEV-Boost relays.",
);
const TWEET_URL = encodeURIComponent("https://mevwatch.info");

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
    <section className="py-12 border-b border-border-labrys">
      {/* Section header */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
            03 / WHAT TO DO
          </div>
          <h2 className="font-sans font-bold text-[34px] leading-[1.05] tracking-[-0.02em] text-foreground m-0">
            Keep Ethereum
            <br />
            credibly neutral.
          </h2>
        </div>
        <div className="text-right font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted leading-relaxed">
          FOR: VALIDATORS, STAKERS, BUILDERS
        </div>
      </div>

      {/* Callout panel */}
      <div className="grid grid-cols-[1fr_1.2fr] border border-border-labrys bg-panel relative overflow-hidden">
        {/* Gradient accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, transparent 0%, transparent 60%, color-mix(in srgb, var(--color-accent-alt) 40%, transparent) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Left side */}
        <div className="p-10 border-r border-border-labrys">
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

          {/* Share strip */}
          <div className="flex mt-8 border border-border-labrys">
            <a
              href={`https://twitter.com/intent/tweet?text=${TWEET_TEXT}&url=${TWEET_URL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3.5 px-3 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted text-center border-r border-border-labrys transition-all duration-[120ms] hover:bg-accent-brand hover:text-foreground"
            >
              Share on X
            </a>
            <a
              href="#"
              className="flex-1 py-3.5 px-3 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted text-center border-r border-border-labrys transition-all duration-[120ms] hover:bg-accent-brand hover:text-foreground"
            >
              Copy link
            </a>
            <a
              href="/embed"
              className="flex-1 py-3.5 px-3 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted text-center border-r border-border-labrys transition-all duration-[120ms] hover:bg-accent-brand hover:text-foreground"
            >
              Embed
            </a>
            <a
              href="#"
              className="flex-1 py-3.5 px-3 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted text-center transition-all duration-[120ms] hover:bg-accent-brand hover:text-foreground"
            >
              Cite
            </a>
          </div>
        </div>

        {/* Right side — validator steps */}
        <div className="p-10 flex flex-col justify-center relative z-10">
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
    </section>
  );
}
