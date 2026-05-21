import { formatPercent } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/queries";
import { Section } from "@/components/section";

interface LeaderboardProps {
  rows: LeaderboardRow[];
}

export function Leaderboard({ rows }: LeaderboardProps) {
  return (
    <Section
      label="02 / RELAY LEADERBOARD"
      title={
        <>
          Ranked by
          <br />
          block share.
        </>
      }
      aside={
        <>
          SORT: SHARE DESC // WINDOW: 1D
          <br />
          SOURCE: RELAYSCAN.IO + BEACON
        </>
      }
    >
      {/* Table */}
      <table className="w-full border-collapse font-mono text-[13px]">
        <thead>
          <tr>
            <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel-alt border-t border-b border-border-labrys w-10">
              #
            </th>
            <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel-alt border-t border-b border-border-labrys">
              RELAY
            </th>
            <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel-alt border-t border-b border-border-labrys">
              POSTURE
            </th>
            <th className="text-left font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel-alt border-t border-b border-border-labrys">
              SHARE
            </th>
            <th className="text-right font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-3 py-3.5 bg-panel-alt border-t border-b border-border-labrys">
              BLOCKS
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-8 text-center font-mono text-[13px] text-fg-muted border-b border-border-labrys"
              >
                No relay data available for the current period.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rank = String(index + 1).padStart(2, "0");
              const isCensoring = row.posture === "censoring";
              const isNeutral = row.posture === "neutral";

              return (
                <tr
                  key={row.relayId}
                  className="border-b border-border-labrys transition-colors duration-[120ms] hover:bg-accent-alt/15 group"
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
                          className={`absolute left-0 top-0 bottom-0 ${isCensoring ? "bg-ofac" : "bg-neutral-relay"}`}
                          style={{ width: `${Math.min(row.sharePct, 100)}%` }}
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
    </Section>
  );
}
