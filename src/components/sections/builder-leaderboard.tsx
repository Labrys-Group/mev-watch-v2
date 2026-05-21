import { formatPercent } from "@/lib/format";
import type { BuilderRow } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";

interface BuilderLeaderboardProps {
  rows: BuilderRow[];
}

export function BuilderLeaderboard({ rows }: BuilderLeaderboardProps) {
  return (
    <Section
      label="04 / BUILDER LEADERBOARD"
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
              BUILDER
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
                colSpan={4}
                className="px-3 py-8 text-center font-mono text-[13px] text-fg-muted border-b border-border-labrys"
              >
                No builder data available for the current period.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rank = String(index + 1).padStart(2, "0");

              return (
                <tr
                  key={row.builderId}
                  className="reveal-row border-b border-border-labrys transition-colors duration-200 hover:bg-accent-alt/15 group"
                  style={{ "--delay": `${index * 45}ms` } as CSSVars}
                >
                  {/* Rank */}
                  <td className="px-3 py-3.5 align-middle font-mono text-[13px] text-fg-muted tabular-nums transition-colors duration-200 group-hover:text-accent-brand">
                    {rank}
                  </td>

                  {/* Builder id */}
                  <td className="px-3 py-3.5 align-middle max-w-[260px]">
                    <div className="font-sans font-bold text-[15px] tracking-[-0.01em] text-foreground leading-snug break-words transition-colors duration-200 group-hover:text-accent-brand">
                      {row.builderId}
                    </div>
                  </td>

                  {/* Share — mini-bar + percent */}
                  <td className="px-3 py-3.5 align-middle">
                    <span className="inline-flex items-center gap-2.5">
                      {/* Mini bar */}
                      <span className="relative inline-block w-[140px] h-1.5 bg-foreground/5 shrink-0 align-middle">
                        <span
                          className="grow-bar absolute left-0 top-0 bottom-0 bg-neutral-relay"
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
                      <span className="font-mono text-[14px] tracking-[0.02em] tabular-nums text-fg-muted">
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
