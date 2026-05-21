import { formatPercent } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";

interface LeaderboardProps {
  rows: LeaderboardRow[];
}

const TH =
  "text-left font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted px-2.5 py-2.5 bg-panel-alt border-t border-b border-border-labrys";

export function Leaderboard({ rows }: LeaderboardProps) {
  return (
    <Section
      label="03 / RELAY LEADERBOARD"
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
      {/* Table — scrolls horizontally on narrow screens */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[440px] border-collapse font-mono text-[12px]">
          <thead>
            <tr>
              <th className={`${TH} w-9`}>#</th>
              <th className={TH}>RELAY</th>
              <th className={TH}>POSTURE</th>
              <th className={TH}>SHARE</th>
              <th className={`${TH} text-right`}>BLOCKS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-2.5 py-7 text-center font-mono text-[12px] text-fg-muted border-b border-border-labrys"
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
                    className="reveal-row border-b border-border-labrys transition-colors duration-200 hover:bg-accent-alt/15 group"
                    style={{ "--delay": `${index * 45}ms` } as CSSVars}
                  >
                    {/* Rank */}
                    <td className="px-2.5 py-2.5 align-middle font-mono text-[12px] text-fg-muted tabular-nums transition-colors duration-200 group-hover:text-accent-brand">
                      {rank}
                    </td>

                    {/* Relay name + id */}
                    <td className="px-2.5 py-2.5 align-middle">
                      <div className="font-sans font-bold text-[13.5px] tracking-[-0.01em] text-foreground leading-snug transition-colors duration-200 group-hover:text-accent-brand">
                        {row.name}
                      </div>
                      <div className="font-mono text-[10.5px] text-fg-muted mt-0.5 leading-tight">
                        {row.relayId}
                      </div>
                    </td>

                    {/* Posture badge */}
                    <td className="px-2.5 py-2.5 align-middle">
                      {isCensoring ? (
                        <span className="inline-block font-mono text-[9.5px] tracking-[0.12em] uppercase px-2 py-[3px] border text-warn border-warn">
                          OFAC
                        </span>
                      ) : isNeutral ? (
                        <span className="inline-block font-mono text-[9.5px] tracking-[0.12em] uppercase px-2 py-[3px] border text-good border-good">
                          NEUTRAL
                        </span>
                      ) : (
                        <span className="inline-block font-mono text-[9.5px] tracking-[0.12em] uppercase px-2 py-[3px] border text-fg-muted border-border-labrys">
                          UNKNOWN
                        </span>
                      )}
                    </td>

                    {/* Share — mini-bar + percent */}
                    <td className="px-2.5 py-2.5 align-middle">
                      <span className="inline-flex items-center gap-2.5">
                        {/* Mini bar — hidden on the smallest screens */}
                        <span className="relative hidden sm:inline-block w-[88px] h-1.5 bg-foreground/5 shrink-0 align-middle">
                          <span
                            className={`grow-bar absolute left-0 top-0 bottom-0 ${isCensoring ? "bg-ofac" : "bg-neutral-relay"}`}
                            style={
                              {
                                width: `${Math.min(row.sharePct, 100)}%`,
                                "--delay": `${index * 45 + 160}ms`,
                              } as CSSVars
                            }
                            aria-hidden="true"
                          />
                        </span>
                        {/* Percent value */}
                        <span
                          className={`font-mono text-[13px] tracking-[0.02em] tabular-nums ${
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
                    <td className="px-2.5 py-2.5 align-middle text-right font-mono text-[13px] tracking-[0.02em] tabular-nums text-foreground">
                      {row.blocks.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
