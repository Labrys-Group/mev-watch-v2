import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { getLeaderboard } from "@/lib/queries";
import { formatPercent } from "@/lib/format";
import { RELAYS } from "@/config/relays";

export const metadata: Metadata = {
  title: "Relays | MEV Watch",
  description:
    "Live relay leaderboard and canonical directory of every MEV-boost relay tracked by MEV Watch, with editorial OFAC-censorship classifications.",
};

// Re-render hourly alongside the refresh job cadence.
export const revalidate = 3600;

export default async function ExplorerPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="terminal-grid min-h-screen">
      <div className="mx-auto max-w-[1280px] px-6">
        <SiteHeader />

        <main>
          {/* Page heading */}
          <div className="py-12 border-b border-border-labrys">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-accent-brand mb-4">
              // relay explorer
            </p>
            <h1 className="font-sans font-bold text-4xl tracking-tight text-foreground leading-tight m-0">
              Relay directory &amp; leaderboard
            </h1>
            <p className="font-mono text-sm text-fg-muted mt-4 leading-relaxed max-w-2xl">
              Every MEV-boost relay tracked by MEV Watch, its editorial OFAC
              classification, and its most-recent daily block share. Posture
              determines whether the relay is counted in the censorship metric on
              the{" "}
              <Link
                href="/"
                className="text-accent-brand hover:underline transition-colors"
              >
                dashboard
              </Link>
              .
            </p>
          </div>

          {/* ── Section 1 — Live leaderboard ── */}
          <section className="py-12 border-b border-border-labrys">
            <div className="flex justify-between items-end mb-7">
              <div>
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
                  01 / LATEST LEADERBOARD
                </div>
                <h2 className="font-sans font-bold text-[34px] leading-[1.05] tracking-[-0.02em] text-foreground m-0">
                  Ranked by
                  <br />
                  block share.
                </h2>
              </div>
              <div className="text-right font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted leading-relaxed">
                SORT: SHARE DESC // WINDOW: 1D
                <br />
                SOURCE: RELAYSCAN.IO + BEACON
              </div>
            </div>

            <table className="w-full border-collapse font-mono text-[13px]">
              <thead>
                <tr>
                  <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel border-t border-b border-border-labrys w-10">
                    #
                  </th>
                  <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel border-t border-b border-border-labrys">
                    RELAY
                  </th>
                  <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel border-t border-b border-border-labrys">
                    POSTURE
                  </th>
                  <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel border-t border-b border-border-labrys">
                    SHARE
                  </th>
                  <th className="text-right font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel border-t border-b border-border-labrys">
                    BLOCKS
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center font-mono text-[13px] text-fg-muted border-b border-border-labrys"
                    >
                      No relay data available for the current period. Run{" "}
                      <code className="text-foreground">pnpm seed-history</code>{" "}
                      to populate the database.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((row, index) => {
                    const rank = String(index + 1).padStart(2, "0");
                    const isCensoring = row.posture === "censoring";
                    const isNeutral = row.posture === "neutral";

                    return (
                      <tr
                        key={row.relayId}
                        className="border-b border-border-labrys transition-colors duration-[120ms] hover:bg-accent-alt/15"
                      >
                        {/* Rank */}
                        <td className="px-3 py-3.5 align-middle font-mono text-[13px] text-fg-muted tabular-nums">
                          {rank}
                        </td>

                        {/* Relay name + id */}
                        <td className="px-3 py-3.5 align-middle">
                          <div className="font-sans font-bold text-[15px] tracking-[-0.01em] text-foreground leading-snug">
                            {row.name}
                          </div>
                          <div className="font-mono text-[11px] text-fg-muted mt-0.5 leading-tight">
                            {row.relayId}
                          </div>
                        </td>

                        {/* Posture badge */}
                        <td className="px-3 py-3.5 align-middle">
                          {isCensoring ? (
                            <span className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-[3px] border text-warn border-warn">
                              OFAC
                            </span>
                          ) : isNeutral ? (
                            <span className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-[3px] border text-good border-good">
                              NEUTRAL
                            </span>
                          ) : (
                            <span className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-[3px] border text-fg-muted border-border-labrys">
                              UNKNOWN
                            </span>
                          )}
                        </td>

                        {/* Share — mini-bar + percent */}
                        <td className="px-3 py-3.5 align-middle">
                          <span className="inline-flex items-center gap-2.5">
                            {/* Mini bar */}
                            <span className="relative inline-block w-[140px] h-1.5 bg-foreground/5 shrink-0 align-middle">
                              <span
                                className={`absolute left-0 top-0 bottom-0 ${
                                  isCensoring ? "bg-ofac" : "bg-neutral-relay"
                                }`}
                                style={{
                                  width: `${Math.min(row.sharePct, 100)}%`,
                                }}
                                aria-hidden="true"
                              />
                            </span>
                            {/* Percent value */}
                            <span
                              className={`font-mono text-[14px] tracking-[0.02em] tabular-nums ${
                                isCensoring
                                  ? "text-warn"
                                  : isNeutral
                                    ? "text-good"
                                    : "text-fg-muted"
                              }`}
                            >
                              {formatPercent(row.sharePct)}
                            </span>
                          </span>
                        </td>

                        {/* Block count */}
                        <td className="px-3 py-3.5 align-middle text-right font-mono text-[14px] tracking-[0.02em] tabular-nums text-foreground">
                          {row.blocks.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          {/* ── Section 2 — Relay directory ── */}
          <section className="py-12 border-b border-border-labrys">
            <div className="flex justify-between items-end mb-7">
              <div>
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
                  02 / RELAY DIRECTORY
                </div>
                <h2 className="font-sans font-bold text-[34px] leading-[1.05] tracking-[-0.02em] text-foreground m-0">
                  Canonical relay
                  <br />
                  reference.
                </h2>
              </div>
              <div className="text-right font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted leading-relaxed max-w-xs">
                CLASSIFICATION IS EDITORIAL
                <br />
                SOURCE:{" "}
                <code className="text-foreground normal-case tracking-normal">
                  src/config/relays.ts
                </code>
              </div>
            </div>

            <p className="font-mono text-sm text-fg-muted mb-6 leading-relaxed max-w-2xl">
              Whether a relay filters OFAC-sanctioned transactions is an
              editorial judgement — not a value derivable from chain data alone.
              This directory is maintained by hand in{" "}
              <code className="font-mono text-xs text-foreground border border-border-labrys px-1.5 py-0.5">
                src/config/relays.ts
              </code>
              . See the{" "}
              <Link
                href="/methodology"
                className="text-accent-brand hover:underline transition-colors"
              >
                methodology page
              </Link>{" "}
              for the full classification rationale.
            </p>

            {/* Directory table */}
            <div className="border border-border-labrys overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_2fr] border-b border-border-labrys bg-panel">
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

              {/* Data rows */}
              {RELAYS.map((relay, idx) => {
                const isCensoring = relay.posture === "censoring";
                const isNeutral = relay.posture === "neutral";
                const isLast = idx === RELAYS.length - 1;

                return (
                  <div
                    key={relay.id}
                    className={`grid grid-cols-[1fr_auto_2fr] ${!isLast ? "border-b border-border-labrys" : ""}`}
                  >
                    <div className="font-sans font-bold text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                      {relay.name}
                    </div>
                    <div className="px-4 py-3 border-r border-border-labrys flex items-center">
                      {isCensoring ? (
                        <span className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-[3px] border text-warn border-warn">
                          OFAC
                        </span>
                      ) : isNeutral ? (
                        <span className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-[3px] border text-good border-good">
                          NEUTRAL
                        </span>
                      ) : (
                        <span className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-[3px] border text-fg-muted border-border-labrys">
                          UNKNOWN
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-fg-muted px-4 py-3 break-all">
                      {relay.id}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="font-mono text-[11px] text-fg-muted mt-4 leading-relaxed max-w-2xl">
              Relays with an{" "}
              <span className="text-fg-muted border border-border-labrys px-1">
                UNKNOWN
              </span>{" "}
              posture are treated as non-censoring in the metric until their
              policy can be confirmed. Relays that appear in relayscan data but
              are absent from this list are also treated as unknown and excluded
              from the censoring total.
            </p>
          </section>

          {/* Footer note */}
          <div className="py-8">
            <p className="font-mono text-[11px] text-fg-muted leading-relaxed">
              Relay policy changes?{" "}
              <a
                href="https://github.com/Labrys-Group/mev-watch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-brand hover:underline transition-colors"
              >
                Open a PR on GitHub
              </a>{" "}
              to update the classification in{" "}
              <code className="font-mono text-xs text-foreground border border-border-labrys px-1.5 py-0.5">
                src/config/relays.ts
              </code>
              .
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
