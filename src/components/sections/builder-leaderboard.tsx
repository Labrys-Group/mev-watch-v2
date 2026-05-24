import { formatPercent } from "@/lib/format";
import type { BuilderRow } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";

interface BuilderLeaderboardProps {
  rows: BuilderRow[];
}

const TH =
  "text-left font-mono text-[10px] tracking-[0.14em] uppercase text-fg-muted px-2 py-2.5 max-[360px]:px-1 sm:px-2.5 bg-panel-alt border-t border-b border-border-labrys";

export function BuilderLeaderboard({ rows }: BuilderLeaderboardProps) {
  // Caption surfaces the timeframe + the block-total so readers don't have to
  // infer "WINDOW: 1D" from the cryptic aside (also invisible on mobile).
  const totalBlocks = rows.reduce((sum, r) => sum + r.blocks, 0);

  return (
    <Section
      label="05 / BUILDER LEADERBOARD"
      title="Ranked by block share."
      pattern="ticks"
      accent="var(--neutral)"
      aside={
        <>
          SORT: SHARE DESC
          <br />
          SOURCE: RELAYSCAN.IO + BEACON
        </>
      }
    >
      <p className="mb-3 border-b border-border-labrys pb-3 font-sans text-[13px] leading-snug text-fg-muted">
        Top builders by share — last 24 hours ·{" "}
        <strong className="font-semibold text-foreground">
          {totalBlocks.toLocaleString()} blocks
        </strong>
        .
      </p>
      {/* Table — fits to width on phones; overflow guard for ultra-narrow */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full border-collapse font-mono text-[12px]">
          <thead>
            <tr>
              <th className={`${TH} w-9`}>#</th>
              <th className={TH}>BUILDER</th>
              <th className={TH}>SHARE</th>
              <th className={`${TH} text-right`}>BLOCKS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-2.5 py-7 text-center font-mono text-[12px] text-fg-muted border-b border-border-labrys"
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
                    <td className="px-2 py-2.5 max-[360px]:px-1 sm:px-2.5 align-middle font-mono text-[12px] text-fg-muted tabular-nums transition-colors duration-200 group-hover:text-accent-brand">
                      {rank}
                    </td>

                    {/* Builder id */}
                    <td className="px-2 py-2.5 max-[360px]:px-1 sm:px-2.5 align-middle max-w-[220px]">
                      <div className="font-sans font-bold text-[13.5px] tracking-[-0.01em] text-foreground leading-snug break-words transition-colors duration-200 group-hover:text-accent-brand">
                        {row.builderId}
                      </div>
                    </td>

                    {/* Share — mini-bar + percent */}
                    <td className="px-2 py-2.5 max-[360px]:px-1 sm:px-2.5 align-middle">
                      <span className="inline-flex items-center gap-2.5">
                        {/* Mini bar — hidden on the smallest screens */}
                        <span className="relative hidden sm:inline-block w-[88px] h-1.5 bg-foreground/5 shrink-0 align-middle">
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
                        <span className="font-mono text-[13px] tracking-[0.02em] tabular-nums text-fg-muted">
                          {formatPercent(row.sharePct)}
                        </span>
                      </span>
                    </td>

                    {/* Block count */}
                    <td className="px-2 py-2.5 max-[360px]:px-1 sm:px-2.5 align-middle text-right font-mono text-[13px] tracking-[0.02em] tabular-nums text-foreground">
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
