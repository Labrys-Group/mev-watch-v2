import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";

export const metadata: Metadata = {
  title: "Methodology | MEV Watch",
  description:
    "How MEV Watch measures OFAC censorship on Ethereum: data source, metric definition, relay classification, and known limitations.",
};

export default function MethodologyPage() {
  return (
    <div className="terminal-grid min-h-screen">
      <div className="mx-auto max-w-[900px] px-6">
        <SiteHeader />

        <main className="py-12">
          {/* Page title */}
          <div className="mb-10 border-b border-border-labrys pb-8">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-accent-brand mb-4">
              {"// methodology"}
            </p>
            <h1 className="font-sans font-bold text-4xl tracking-tight text-foreground leading-tight m-0">
              How MEV Watch measures Ethereum censorship
            </h1>
            <p className="font-mono text-sm text-fg-muted mt-4 leading-relaxed max-w-2xl">
              MEV Watch tracks the share of Ethereum block flow that passes
              through OFAC-censoring relays in the MEV-boost ecosystem. This
              page explains what that means, where the data comes from, how the
              metric is calculated, and where the approach falls short.
            </p>
          </div>

          {/* Section 1 — What MEV Watch measures */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              What MEV Watch measures
            </h2>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              MEV Watch answers one question: what fraction of Ethereum
              MEV-boost block flow is currently delivered through relays that
              apply OFAC sanctions filtering?
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              When that number is high, the majority of validators are building
              on blocks curated by censoring infrastructure — meaning
              OFAC-sanctioned transactions (such as interactions with Tornado
              Cash contracts) are systematically excluded from a large proportion
              of Ethereum blocks. When it is low, most block flow passes through
              relays that include all valid transactions regardless of origin.
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed">
              The metric is a daily snapshot derived from relay-level payload
              delivery counts. It does not measure on-chain transaction inclusion
              directly, but relay market share is a reliable leading indicator of
              censorship pressure on Ethereum&apos;s block production pipeline.
            </p>
          </section>

          {/* Section 2 — MEV-Boost and relays */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              MEV-Boost and relays
            </h2>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              MEV-Boost is an out-of-protocol sidecar run by most Ethereum
              validators. Instead of building blocks locally, a validator running
              MEV-Boost outsources block construction to a competitive market of
              block builders who submit their best blocks to{" "}
              <span className="text-foreground">relays</span> — trusted
              intermediaries that validate and auction those blocks to validators.
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              Each relay operates its own inclusion policy. Some relays
              (classified here as{" "}
              <span className="text-accent-brand">censoring</span>) instruct
              their builders to exclude transactions involving OFAC-sanctioned
              addresses before submitting a bid. Other relays (classified as{" "}
              <span className="text-foreground">neutral</span>) apply no such
              filter and include all valid transactions.
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed">
              Because most validators connect to multiple relays simultaneously
              and accept whichever relay offers the highest-value block for each
              slot, the aggregate share of payload deliveries across censoring
              relays is a proxy for how often censoring infrastructure wins the
              block auction.
            </p>
          </section>

          {/* Section 3 — Data source */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              Data source
            </h2>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
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
            <div className="border border-border-labrys bg-background px-4 py-3 mb-4">
              <code className="font-mono text-xs text-foreground tracking-wide">
                GET /stats/day/&#123;date&#125;/json
              </code>
            </div>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              A scheduled job fetches the previous day&apos;s stats each morning
              and writes them as an immutable snapshot to the MEV Watch database.
              The site reads only its own snapshot store — it does not query
              relayscan.io on page load — so the displayed data reflects the last
              successful ingestion run.
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed">
              Each API response includes a per-relay count of{" "}
              <span className="text-foreground">payload deliveries</span>: the
              number of times each relay successfully returned a signed execution
              payload to a requesting validator. This is the raw figure used to
              compute the censorship metric.
            </p>
          </section>

          {/* Section 4 — The metric */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              The metric
            </h2>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              The daily censorship percentage is defined as:
            </p>

            {/* Formula callout */}
            <div className="border border-border-labrys bg-background px-6 py-5 mb-6">
              <p className="font-mono text-xs text-fg-muted tracking-[0.12em] uppercase mb-3">
                formula
              </p>
              <p className="font-sans font-bold text-lg text-foreground leading-snug">
                Censorship %{" "}
                <span className="text-fg-muted font-normal">=</span>{" "}
                <span className="text-accent-brand">
                  deliveries via censoring relays
                </span>{" "}
                <span className="text-fg-muted font-normal">/</span>{" "}
                <span className="text-foreground">
                  total deliveries across all relays
                </span>
              </p>
            </div>

            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              Both the numerator and denominator count{" "}
              <span className="text-foreground">payload deliveries</span>, not
              unique blocks. This is intentional. When a validator connects to
              multiple relays, more than one relay may deliver a payload for the
              same slot — relayscan counts each delivery separately, meaning a
              single block can contribute more than once to the total. Using a
              ratio (share) rather than a raw block count is the honest
              approach: the multi-relay double-counting cancels between numerator
              and denominator, so the ratio accurately reflects the relative
              weight of censoring relay flow.
            </p>
            <p className="font-mono text-sm text-fg-muted leading-relaxed">
              Concretely: if censoring relays collectively deliver 40 out of 100
              total payloads on a given day, the censorship percentage is 40%,
              regardless of whether some of those payloads corresponded to the
              same underlying block. The ratio is consistent because any
              double-counting affects both sides equally.
            </p>
          </section>

          {/* Section 5 — OFAC classification */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              OFAC relay classification
            </h2>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-4">
              Whether a relay applies OFAC sanctions filtering is an editorial
              judgement — it cannot be inferred from on-chain data alone. MEV
              Watch maintains this classification by hand in{" "}
              <code className="font-mono text-xs text-foreground border border-border-labrys px-1.5 py-0.5">
                src/config/relays.ts
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

            {/* Relay table */}
            <div className="border border-border-labrys mt-6 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys bg-background">
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3 border-r border-border-labrys">
                  Relay
                </div>
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3 border-r border-border-labrys">
                  Posture
                </div>
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3">
                  Identifier (relayscan.io)
                </div>
              </div>

              {/* Ultra Sound */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  Ultra Sound
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                    neutral
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  relay.ultrasound.money
                </div>
              </div>

              {/* Titan */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  Titan
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                    neutral
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  titanrelay.xyz
                </div>
              </div>

              {/* bloXroute Max Profit */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  bloXroute Max Profit
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-red-500 border border-red-500 px-2 py-0.5">
                    censoring
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  bloxroute.max-profit.blxrbdn.com
                </div>
              </div>

              {/* bloXroute Regulated */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  bloXroute Regulated
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-red-500 border border-red-500 px-2 py-0.5">
                    censoring
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  bloxroute.regulated.blxrbdn.com
                </div>
              </div>

              {/* Aestus */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  Aestus
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                    neutral
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  aestus.live
                </div>
              </div>

              {/* Flashbots */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  Flashbots
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-red-500 border border-red-500 px-2 py-0.5">
                    censoring
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  boost-relay.flashbots.net
                </div>
              </div>

              {/* Agnostic Gnosis */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  Agnostic Gnosis
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                    neutral
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  agnostic-relay.net
                </div>
              </div>

              {/* EthGas */}
              <div className="grid grid-cols-[1fr_auto_2fr]">
                <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                  EthGas
                </div>
                <div className="px-4 py-3 border-r border-border-labrys">
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-muted border border-border-labrys px-2 py-0.5">
                    unknown
                  </span>
                </div>
                <div className="font-mono text-xs text-fg-muted px-4 py-3">
                  relay.ethgas.com
                </div>
              </div>
            </div>

            <p className="font-mono text-[11px] text-fg-muted mt-4 leading-relaxed">
              Relays with an{" "}
              <span className="text-fg-muted border border-border-labrys px-1">
                unknown
              </span>{" "}
              posture are treated as non-censoring in the metric until their
              policy can be confirmed. Unconfigured relays that appear in
              relayscan data but are not in this list are also treated as{" "}
              <span className="font-mono">unknown</span> and excluded from the
              censoring total.
            </p>
          </section>

          {/* Section 6 — Limitations */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              Limitations
            </h2>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-6">
              MEV Watch is a useful first-order signal, but it is not a complete
              picture of Ethereum censorship. The following limitations apply:
            </p>
            <ul className="space-y-4 m-0 p-0 list-none">
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  01
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Relay-level posture, not per-block measurement
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    The censorship classification is applied at the relay level,
                    not verified per block. A relay labelled{" "}
                    <span className="font-mono text-foreground">censoring</span>{" "}
                    may occasionally include sanctioned transactions if its
                    upstream builders do, and vice versa. MEV Watch does not
                    inspect individual block contents.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  02
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Locally-built blocks are not counted
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    Validators that build blocks locally (without MEV-Boost) are
                    not tracked by relayscan and therefore not reflected in this
                    metric. Local blocks tend to be censorship-neutral. Their
                    exclusion means the censorship percentage may overstate the
                    true proportion of all Ethereum blocks that are censored.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  03
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Editorial classification can lag policy changes
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    Relay operators sometimes change their filtering policy
                    without public announcement. The{" "}
                    <code className="font-mono text-xs text-foreground border border-border-labrys px-1 py-0.5">
                      relays.ts
                    </code>{" "}
                    classification is updated manually when changes are detected.
                    There may be a lag between a real-world posture change and
                    the update reflected here.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  04
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Daily granularity only — no live per-block stream
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    Data is updated once per day from a daily snapshot. A
                    real-time, per-block stream of censorship data is not
                    currently available. Intra-day changes in relay composition
                    are not captured until the following day&apos;s update.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* Footer note */}
          <div className="py-8">
            <p className="font-mono text-[11px] text-fg-muted leading-relaxed">
              Questions or corrections?{" "}
              <a
                href="https://github.com/Labrys-Group/mev-watch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-brand hover:underline transition-colors"
              >
                Open an issue on GitHub
              </a>
              . The relay classification and all supporting data are public and
              open-source.
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
