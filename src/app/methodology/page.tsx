import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { RELAYS } from "@/config/relays";
import type { CSSVars } from "@/lib/css";

export const metadata: Metadata = {
  title: "Methodology | MEV Watch",
  description:
    "How MEV Watch measures OFAC censorship on Ethereum: data source, metric definition, relay classification, and known limitations.",
};

interface Limitation {
  n: string;
  title: string;
  body: ReactNode;
}

const LIMITATIONS: Limitation[] = [
  {
    n: "01",
    title: "Relay-level posture, not per-block measurement",
    body: (
      <>
        The censorship classification is applied at the relay level, not
        verified per block. A relay labelled{" "}
        <span className="font-mono text-foreground">censoring</span> may
        occasionally include sanctioned transactions if its upstream builders
        do, and vice versa. MEV Watch does not inspect individual block
        contents.
      </>
    ),
  },
  {
    n: "02",
    title: "Locally-built blocks are not counted",
    body: (
      <>
        Validators that build blocks locally (without MEV-Boost) are not part of
        the MEV-Boost flow and therefore not counted in either the numerator or
        the denominator. The non-boost composition band on the dashboard shows
        their share of the overall chain separately. Because local blocks tend
        to be censorship-neutral, the censorship percentage may overstate the
        true proportion of all Ethereum blocks that are censored.
      </>
    ),
  },
  {
    n: "03",
    title: "Editorial classification can lag policy changes",
    body: (
      <>
        Relay operators sometimes change their filtering policy without public
        announcement. The{" "}
        <code className="font-mono text-xs text-foreground border border-border-labrys px-1 py-0.5">
          relays.json
        </code>{" "}
        classification is updated manually when changes are detected. There may
        be a lag between a real-world posture change and the update reflected
        here.
      </>
    ),
  },
  {
    n: "04",
    title: "Headline is daily",
    body: (
      <>
        The headline censorship percentage is a daily snapshot. Intra-day
        changes in relay composition do not move it until the next UTC
        day&apos;s checked-in data snapshot is generated. The dashboard does not
        poll relay APIs on page load.
      </>
    ),
  },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="space-y-4 py-5">
          {/* Page hero — same vocabulary as the home Hero: panel card, faded
              grid texture, tinted radial wash, line-rise entrance animation. */}
          <section className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(115% 125% at 0% 0%, color-mix(in oklch, var(--accent-color) 14%, transparent) 0%, transparent 58%)",
              }}
            />
            <div
              aria-hidden="true"
              className="faded-grid pointer-events-none absolute inset-0"
            />

            <div className="relative">
              <div
                className="anim-fade-up inline-flex items-center gap-2.5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-accent-brand mb-4"
                style={{ "--delay": "80ms" } as CSSVars}
              >
                <span aria-hidden="true">{"// "}</span>
                METHODOLOGY
              </div>

              <h1
                className="font-sans font-extrabold leading-[0.98] tracking-[-0.03em] m-0 text-foreground"
                style={{ fontSize: "clamp(2rem, 5.4vw, 3.4rem)" }}
              >
                <span className="line-mask block">
                  <span
                    className="line-rise"
                    style={{ "--delay": "160ms" } as CSSVars}
                  >
                    How MEV Watch measures
                  </span>
                </span>
                <span className="line-mask block">
                  <span
                    className="line-rise text-accent-brand"
                    style={{ "--delay": "260ms" } as CSSVars}
                  >
                    Ethereum censorship.
                  </span>
                </span>
              </h1>

              <p
                className="anim-fade-up font-mono text-sm text-fg-muted mt-5 leading-relaxed max-w-2xl m-0"
                style={{ "--delay": "440ms" } as CSSVars}
              >
                MEV Watch tracks the share of Ethereum block flow that passes
                through OFAC-censoring relays in the MEV-boost ecosystem. This
                page explains what that means, where the data comes from, how
                the metric is calculated, and where the approach falls short.
              </p>
            </div>
          </section>

          {/* 01 / WHAT MEV WATCH MEASURES */}
          <Reveal>
            <Section
              label="01 / WHAT MEV WATCH MEASURES"
              title="One number, one question."
              aside="SCOPE // MEV-BOOST BLOCK FLOW"
              pattern="line-grid"
              accent="var(--accent-alt-color)"
            >
              <div className="space-y-4 font-mono text-sm leading-relaxed text-fg-muted max-w-2xl">
                <p className="m-0">
                  MEV Watch answers one question: what fraction of Ethereum
                  MEV-boost block flow is currently delivered through relays
                  that apply OFAC sanctions filtering?
                </p>
                <p className="m-0">
                  When that number is high, the majority of validators are
                  building on blocks curated by censoring infrastructure —
                  meaning OFAC-sanctioned transactions (such as interactions
                  with Tornado Cash contracts) are systematically excluded from
                  a large proportion of Ethereum blocks. When it is low, most
                  block flow passes through relays that include all valid
                  transactions regardless of origin.
                </p>
                <p className="m-0">
                  The metric is a daily snapshot derived from relay-level
                  payload delivery counts. It does not measure on-chain
                  transaction inclusion directly, but relay market share is a
                  reliable leading indicator of censorship pressure on
                  Ethereum&apos;s block production pipeline.
                </p>
              </div>
            </Section>
          </Reveal>

          {/* 02 / MEV-BOOST + RELAYS */}
          <Reveal>
            <Section
              label="02 / MEV-BOOST + RELAYS"
              title="How block flow works."
              aside="ROLE // AUCTION INTERMEDIARIES"
              pattern="diagonal-hatch"
              accent="var(--fg-muted)"
            >
              <div className="space-y-4 font-mono text-sm leading-relaxed text-fg-muted max-w-2xl">
                <p className="m-0">
                  MEV-Boost is an out-of-protocol sidecar run by most Ethereum
                  validators. Instead of building blocks locally, a validator
                  running MEV-Boost outsources block construction to a
                  competitive market of block builders who submit their best
                  blocks to{" "}
                  <span className="text-foreground">relays</span> — trusted
                  intermediaries that validate and auction those blocks to
                  validators.
                </p>
                <p className="m-0">
                  Each relay operates its own inclusion policy. Some relays
                  (classified here as{" "}
                  <span className="text-warn">censoring</span>) instruct their
                  builders to exclude transactions involving OFAC-sanctioned
                  addresses before submitting a bid. Other relays (classified
                  as <span className="text-good">neutral</span>) apply no such
                  filter and include all valid transactions.
                </p>
                <p className="m-0">
                  Because most validators connect to multiple relays
                  simultaneously and accept whichever relay offers the
                  highest-value block for each slot, the aggregate share of
                  payload deliveries across censoring relays is a proxy for how
                  often censoring infrastructure wins the block auction.
                </p>
              </div>
            </Section>
          </Reveal>

          {/* 03 / DATA SOURCE */}
          <Reveal>
            <Section
              label="03 / DATA SOURCE"
              title="Where the numbers come from."
              aside="SOURCE // RELAYSCAN.IO"
              pattern="ticks"
              accent="var(--accent-color)"
            >
              <div className="space-y-4 font-mono text-sm leading-relaxed text-fg-muted max-w-2xl">
                <p className="m-0">
                  All relay market-share data is sourced from{" "}
                  <a
                    href="https://relayscan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-brand hover:underline transition-colors"
                  >
                    relayscan.io
                  </a>
                  , a Flashbots-maintained relay analytics service. MEV Watch
                  consumes its public JSON API at the endpoint:
                </p>
              </div>

              {/* Endpoint callout — chip-labelled box, matches the readme card
                  vocabulary on the home Hero. */}
              <div className="relative border border-border-labrys bg-background px-4 py-3.5 mt-4 max-w-2xl">
                <span
                  className="absolute -top-[9px] left-3.5 px-2 bg-background font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-accent-brand"
                  aria-hidden="true"
                >
                  $ endpoint
                </span>
                <code className="font-mono text-xs text-foreground tracking-wide">
                  GET /stats/day/&#123;date&#125;/json
                </code>
              </div>

              <div className="space-y-4 font-mono text-sm leading-relaxed text-fg-muted max-w-2xl mt-4">
                <p className="m-0">
                  A scheduled GitHub Actions workflow runs shortly after each
                  UTC day rolls over, fetching the previous day&apos;s stats and
                  committing them to a checked-in JSON snapshot. The site reads
                  only that local snapshot — it does not query relayscan.io on
                  page load.
                </p>
                <p className="m-0">
                  Each API response includes a per-relay count of{" "}
                  <span className="text-foreground">payload deliveries</span>:
                  the number of times each relay successfully returned a signed
                  execution payload to a requesting validator. This is the raw
                  figure used to compute the censorship metric.
                </p>
              </div>
            </Section>
          </Reveal>

          {/* 04 / THE METRIC */}
          <Reveal>
            <Section
              label="04 / THE METRIC"
              title="The censorship percentage."
              aside="UNIT // SHARE OF DELIVERIES"
              pattern="arcs"
              accent="var(--warn)"
            >
              <p className="font-mono text-sm leading-relaxed text-fg-muted max-w-2xl mb-5 m-0">
                The daily censorship percentage is defined as:
              </p>

              {/* Formula callout — labelled chip on top, big formula below */}
              <div className="relative border border-border-labrys bg-background px-5 py-5">
                <span
                  className="absolute -top-[9px] left-3.5 px-2 bg-background font-mono text-[10px] font-semibold tracking-[0.14em] uppercase text-accent-brand"
                  aria-hidden="true"
                >
                  {"// formula"}
                </span>
                <p className="font-sans font-bold text-base sm:text-lg text-foreground leading-snug m-0">
                  Censorship %{" "}
                  <span className="text-fg-muted font-normal">=</span>{" "}
                  <span className="text-warn">
                    deliveries via censoring relays
                  </span>{" "}
                  <span className="text-fg-muted font-normal">/</span>{" "}
                  <span className="text-foreground">
                    total deliveries across all relays
                  </span>
                </p>
              </div>

              <div className="space-y-4 font-mono text-sm leading-relaxed text-fg-muted max-w-2xl mt-5">
                <p className="m-0">
                  Both the numerator and denominator count{" "}
                  <span className="text-foreground">payload deliveries</span>,
                  not unique blocks. This is intentional. When a validator
                  connects to multiple relays, more than one relay may deliver
                  a payload for the same slot — relayscan counts each delivery
                  separately, meaning a single block can contribute more than
                  once to the total. Using a ratio (share) rather than a raw
                  block count is the honest approach: the multi-relay
                  double-counting cancels between numerator and denominator, so
                  the ratio accurately reflects the relative weight of
                  censoring relay flow.
                </p>
                <p className="m-0">
                  Concretely: if censoring relays collectively deliver 40 out
                  of 100 total payloads on a given day, the censorship
                  percentage is 40%, regardless of whether some of those
                  payloads corresponded to the same underlying block. The
                  ratio is consistent because any double-counting affects both
                  sides equally.
                </p>
              </div>
            </Section>
          </Reveal>

          {/* 05 / OFAC RELAY CLASSIFICATION */}
          <Reveal>
            <Section
              label="05 / OFAC RELAY CLASSIFICATION"
              title="Posture by relay."
              aside={
                <>
                  EDITORIAL
                  <br />
                  SOURCE // ETHSTAKER + RELAY POLICY
                </>
              }
              pattern="line-grid"
              accent="var(--good)"
            >
              <p className="font-mono text-sm leading-relaxed text-fg-muted max-w-2xl mb-5 m-0">
                Whether a relay applies OFAC sanctions filtering is an
                editorial judgement — it cannot be inferred from on-chain data
                alone. MEV Watch maintains this classification by hand in{" "}
                <code className="font-mono text-xs text-foreground border border-border-labrys px-1.5 py-0.5">
                  src/data/relays.json
                </code>
                . Posture assignments are sourced from the{" "}
                <a
                  href="https://ethstaker.cc/mev-relay-list"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-brand hover:underline transition-colors"
                >
                  ethstaker MEV relay list
                </a>{" "}
                and public statements by relay operators. The list is reviewed
                whenever relays are added or change their policy.
              </p>

              {/* Relay table — rendered from src/data/relays.json so methodology
                  copy and the metric calculation share one source of truth.
                  Header row uses bg-panel-alt to match the home leaderboard. */}
              <div className="border border-border-labrys overflow-hidden">
                {/* Table header — hidden on phones; rows read as stacked cards.
                    Fixed posture column (140px) so badges line up cleanly. */}
                <div className="hidden grid-cols-[minmax(0,1.4fr)_140px_minmax(0,2.6fr)] border-b border-border-labrys bg-panel-alt sm:grid">
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted px-4 py-2.5 border-r border-border-labrys">
                    Relay
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted px-4 py-2.5 border-r border-border-labrys">
                    Posture
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted px-4 py-2.5">
                    Identifier (relayscan.io)
                  </div>
                </div>

                {RELAYS.map((relay, idx) => {
                  const isLast = idx === RELAYS.length - 1;
                  const postureCls =
                    relay.posture === "censoring"
                      ? "text-warn border-warn"
                      : relay.posture === "neutral"
                        ? "text-good border-good"
                        : "text-fg-muted border-border-labrys";

                  return (
                    <div
                      key={relay.id}
                      className={`reveal-row group grid grid-cols-[minmax(0,1fr)_110px] sm:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,2.6fr)] transition-colors duration-200 hover:bg-accent-alt/15 ${
                        isLast ? "" : "border-b border-border-labrys"
                      }`}
                      style={{ "--delay": `${idx * 35}ms` } as CSSVars}
                    >
                      <div className="font-sans font-bold text-[13.5px] tracking-[-0.01em] text-foreground px-3 py-2.5 sm:px-4 sm:py-3 border-r border-border-labrys transition-colors duration-200 group-hover:text-accent-brand min-w-0 break-words">
                        {relay.name}
                      </div>
                      {/* Posture cell — flex so the badge centres in the fixed
                          140px column; min-w on the badge keeps the three
                          posture words (CENSORING / NEUTRAL / UNKNOWN) the
                          same visual width so the column never looks ragged. */}
                      <div className="flex items-center px-3 py-2.5 sm:px-4 sm:py-3 sm:border-r sm:border-border-labrys">
                        <span
                          className={`inline-flex w-full justify-center font-mono text-[9.5px] tracking-[0.12em] uppercase border px-2 py-[3px] ${postureCls}`}
                        >
                          {relay.posture}
                        </span>
                      </div>
                      <div className="col-span-2 border-t border-border-labrys font-mono text-[10.5px] text-fg-muted px-3 py-2.5 break-all leading-tight sm:col-span-1 sm:border-t-0 sm:px-4 sm:py-3 min-w-0">
                        {relay.id}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="font-mono text-[11px] text-fg-muted mt-4 leading-relaxed max-w-2xl m-0">
                Relays with an{" "}
                <span className="inline-block font-mono text-[9.5px] tracking-[0.12em] uppercase border border-border-labrys text-fg-muted px-1.5 py-[2px]">
                  unknown
                </span>{" "}
                posture are treated as non-censoring in the metric until their
                policy can be confirmed. Unconfigured relays that appear in
                relayscan data but are not in this list are also treated as
                unknown and excluded from the censoring total.
              </p>
            </Section>
          </Reveal>

          {/* 06 / LIMITATIONS */}
          <Reveal>
            <Section
              label="06 / LIMITATIONS"
              title="Where the metric falls short."
              aside="KNOWN GAPS // BY DESIGN"
              pattern="diagonal-hatch"
              accent="var(--warn)"
            >
              <p className="font-mono text-sm leading-relaxed text-fg-muted max-w-2xl mb-5 m-0">
                MEV Watch is a useful first-order signal, but it is not a
                complete picture of Ethereum censorship. The following
                limitations apply:
              </p>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 p-0 list-none">
                {LIMITATIONS.map((item, i) => (
                  <li
                    key={item.n}
                    className="reveal-item group flex gap-4 border border-border-labrys px-5 py-4 bg-background transition-colors duration-200 hover:bg-panel-alt"
                    style={{ "--delay": `${i * 80}ms` } as CSSVars}
                  >
                    <span className="font-mono text-[10.5px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5 transition-transform duration-200 group-hover:translate-x-0.5">
                      {item.n}
                    </span>
                    <div className="min-w-0">
                      <p className="font-sans font-bold text-[13.5px] tracking-[-0.01em] text-foreground m-0 mb-1.5">
                        {item.title}
                      </p>
                      <p className="font-mono text-[12px] text-fg-muted leading-[1.6] m-0">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          </Reveal>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
