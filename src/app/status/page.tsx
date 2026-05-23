import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Reveal } from "@/components/reveal";
import type { CSSVars } from "@/lib/css";
import { getLastRefresh, getRecentRefreshes } from "@/lib/queries";
import { getLatestStats } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Status | MEV Watch",
  description:
    "Live status of the MEV Watch data pipeline — last refresh time, data freshness, and a log of recent ingestion runs.",
};

export default async function StatusPage() {
  const [lastRefresh, recentRefreshes, latestStats] = await Promise.all([
    getLastRefresh(),
    getRecentRefreshes(),
    getLatestStats(),
  ]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[900px] px-4 md:px-6 py-12">
          {/* Page title */}
          <Reveal className="mb-10 border-b border-border-labrys pb-8">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-accent-brand mb-4">
              {"// status"}
            </p>
            <h1 className="font-sans font-bold text-3xl sm:text-4xl tracking-tight text-foreground leading-tight m-0">
              Data pipeline status
            </h1>
            <p className="font-mono text-sm text-fg-muted mt-4 leading-relaxed max-w-2xl">
              This page shows the health of the MEV Watch data pipeline —
              when it last ran, what data it produced, and a log of recent
              ingestion runs.
            </p>
          </Reveal>

          {/* Current status block */}
          <Reveal className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-6">
              Current status
            </h2>

            <div className="border border-border-labrys bg-panel divide-y divide-border-labrys">
              {/* Last refresh row */}
              <div className="grid grid-cols-[auto_1fr] gap-x-8 px-5 py-4">
                <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted self-center">
                  Last refresh
                </span>
                {lastRefresh ? (
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-sm text-foreground">
                      {formatRelativeTime(lastRefresh.ranAt)}
                    </span>
                    <span
                      className={`font-mono text-[10px] tracking-[0.12em] uppercase border px-2 py-0.5 ${
                        lastRefresh.status === "ok"
                          ? "text-good border-good"
                          : "text-warn border-warn"
                      }`}
                    >
                      {lastRefresh.status}
                    </span>
                    {lastRefresh.source && (
                      <span className="font-mono text-xs text-fg-muted">
                        via {lastRefresh.source}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-sm text-fg-muted">
                    No refresh runs recorded
                  </span>
                )}
              </div>

              {/* Data freshness row */}
              <div className="grid grid-cols-[auto_1fr] gap-x-8 px-5 py-4">
                <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted self-center">
                  Data freshness
                </span>
                {latestStats ? (
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-sm text-foreground">
                      {latestStats.date}
                    </span>
                    <span className="font-mono text-xs text-fg-muted">
                      {formatRelativeTime(new Date(latestStats.date + "T00:00:00Z"))}
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-sm text-fg-muted">
                    No daily stats available
                  </span>
                )}
              </div>
            </div>

            {lastRefresh?.message && lastRefresh.status !== "ok" && (
              <div className="mt-4 border border-warn bg-panel px-5 py-4">
                <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-warn mb-2">
                  Last message
                </p>
                <p className="font-mono text-sm text-fg-muted leading-relaxed">
                  {lastRefresh.message}
                </p>
              </div>
            )}
          </Reveal>

          {/* Recent refresh runs */}
          <Reveal className="py-8">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-6">
              Recent refresh runs
            </h2>

            {recentRefreshes.length === 0 ? (
              <div className="border border-border-labrys px-5 py-8 text-center">
                <p className="font-mono text-sm text-fg-muted">
                  No refresh runs found.
                </p>
              </div>
            ) : (
              <div className="border border-border-labrys overflow-hidden">
                {/* Table header — hidden on phones; rows read as stacked cards */}
                <div className="hidden grid-cols-[2fr_1fr_1fr_3fr] border-b border-border-labrys bg-panel sm:grid">
                  <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3 border-r border-border-labrys">
                    Time
                  </div>
                  <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3 border-r border-border-labrys">
                    Status
                  </div>
                  <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3 border-r border-border-labrys">
                    Source
                  </div>
                  <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted px-4 py-3">
                    Message
                  </div>
                </div>

                {/* Table rows */}
                {recentRefreshes.map((run, idx) => (
                  <div
                    key={idx}
                    className={`reveal-item grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_1fr_3fr] transition-colors duration-200 hover:bg-panel-alt ${
                      idx < recentRefreshes.length - 1
                        ? "border-b border-border-labrys"
                        : ""
                    }`}
                    style={
                      { "--delay": `${Math.min(idx, 16) * 45}ms` } as CSSVars
                    }
                  >
                    <div className="font-mono text-sm text-foreground px-4 py-3 border-r border-border-labrys">
                      {formatRelativeTime(run.ranAt)}
                    </div>
                    <div className="px-4 py-3 sm:border-r sm:border-border-labrys">
                      <span
                        className={`font-mono text-[10px] tracking-[0.12em] uppercase border px-2 py-0.5 ${
                          run.status === "ok"
                            ? "text-good border-good"
                            : "text-warn border-warn"
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-border-labrys font-mono text-xs text-fg-muted px-4 py-3 sm:col-span-1 sm:border-t-0 sm:border-r">
                      {run.source || "—"}
                    </div>
                    <div className="col-span-2 border-t border-border-labrys font-mono text-xs text-fg-muted px-4 py-3 leading-relaxed sm:col-span-1 sm:border-t-0">
                      {run.message ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
