import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";

export const metadata: Metadata = {
  title: "API | MEV Watch",
  description:
    "Public read-only API for MEV Watch censorship data: summary stats, censorship trend since the Merge, and the daily relay leaderboard.",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[900px] px-6">
        <SiteHeader />

        <main className="py-12">
          {/* Page title */}
          <div className="mb-10 border-b border-border-labrys pb-8">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-accent-brand mb-4">
              {"// api reference"}
            </p>
            <h1 className="font-sans font-bold text-4xl tracking-tight text-foreground leading-tight m-0">
              Public API
            </h1>
            <p className="font-mono text-sm text-fg-muted mt-4 leading-relaxed max-w-2xl">
              MEV Watch exposes a read-only JSON API for the censorship data
              powering this site. All endpoints are open with CORS{" "}
              <code className="font-mono text-xs text-foreground border border-border-labrys px-1.5 py-0.5">
                Access-Control-Allow-Origin: *
              </code>
              , cached approximately hourly, and updated with fresh data once
              per day.
            </p>
          </div>

          {/* Base URL callout */}
          <div className="border border-border-labrys bg-panel px-5 py-4 mb-10 flex items-center gap-4">
            <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted shrink-0">
              base url
            </span>
            <code className="font-mono text-sm text-foreground">
              https://mevwatch.info
            </code>
          </div>

          {/* Endpoint 1 — /api/v1/summary */}
          <section className="py-8 border-b border-border-labrys">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                GET
              </span>
              <code className="font-mono text-lg text-foreground">
                /api/v1/summary
              </code>
            </div>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-6">
              Returns the latest day&apos;s censorship stats alongside the
              all-time peak and trough summary since the Merge.
            </p>

            <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
              example response
            </p>
            <pre className="font-mono text-xs text-foreground bg-panel border border-border-labrys px-5 py-4 overflow-x-auto leading-relaxed">
{`{
  "latest": {
    "date": "2024-11-15",
    "censorshipPct": 38.4,
    "neutralPct": 61.6,
    "totalBlocks": 7142
  },
  "summary": {
    "current": 38.4,
    "peak": 79.2,
    "peakDate": "2022-11-15",
    "trough": 11.8
  }
}`}
            </pre>
          </section>

          {/* Endpoint 2 — /api/v1/trend */}
          <section className="py-8 border-b border-border-labrys">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                GET
              </span>
              <code className="font-mono text-lg text-foreground">
                /api/v1/trend
              </code>
            </div>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-6">
              Returns the full daily censorship trend since the Merge, ordered
              chronologically. Suitable for charting the historical trajectory
              of OFAC-censoring relay market share.
            </p>

            <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
              example response
            </p>
            <pre className="font-mono text-xs text-foreground bg-panel border border-border-labrys px-5 py-4 overflow-x-auto leading-relaxed">
{`{
  "trend": [
    { "date": "2022-09-15", "censorshipPct": 14.2 },
    { "date": "2022-09-16", "censorshipPct": 21.7 },
    { "date": "2022-09-17", "censorshipPct": 19.3 },
    ...
  ]
}`}
            </pre>
          </section>

          {/* Endpoint 3 — /api/v1/relays */}
          <section className="py-8 border-b border-border-labrys">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-accent-brand border border-accent-brand px-2 py-0.5">
                GET
              </span>
              <code className="font-mono text-lg text-foreground">
                /api/v1/relays
              </code>
            </div>
            <p className="font-mono text-sm text-fg-muted leading-relaxed mb-6">
              Returns the latest day&apos;s relay leaderboard, ranked by block
              share. Each entry includes the relay&apos;s OFAC posture
              classification.
            </p>

            <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
              example response
            </p>
            <pre className="font-mono text-xs text-foreground bg-panel border border-border-labrys px-5 py-4 overflow-x-auto leading-relaxed">
{`{
  "relays": [
    {
      "relayId": "relay.ultrasound.money",
      "name": "Ultra Sound",
      "posture": "neutral",
      "blocks": 2841,
      "sharePct": 39.8
    },
    {
      "relayId": "boost-relay.flashbots.net",
      "name": "Flashbots",
      "posture": "censoring",
      "blocks": 1563,
      "sharePct": 21.9
    },
    ...
  ]
}`}
            </pre>
          </section>

          {/* Notes */}
          <section className="py-8 border-b border-border-labrys">
            <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground mb-4">
              Notes
            </h2>
            <ul className="space-y-4 m-0 p-0 list-none">
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  01
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Read-only and open
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    All endpoints are GET-only. No authentication or API key is
                    required. CORS is open (
                    <code className="font-mono text-xs text-foreground">
                      Access-Control-Allow-Origin: *
                    </code>
                    ), so requests can be made directly from any browser or
                    frontend.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  02
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Caching and update cadence
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    Responses are cached at the edge for approximately one hour.
                    The underlying data is updated once per day when the
                    previous day&apos;s relay stats are ingested from{" "}
                    <a
                      href="https://relayscan.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-brand hover:underline transition-colors"
                    >
                      relayscan.io
                    </a>
                    . Intra-day polling more frequently than hourly will hit
                    cached responses.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 border border-border-labrys px-5 py-4">
                <span className="font-mono text-[11px] text-accent-brand tracking-[0.1em] shrink-0 pt-0.5">
                  03
                </span>
                <div>
                  <p className="font-sans font-bold text-sm text-foreground mb-1">
                    Posture field values
                  </p>
                  <p className="font-mono text-[12px] text-fg-muted leading-relaxed">
                    The{" "}
                    <code className="font-mono text-xs text-foreground">
                      posture
                    </code>{" "}
                    field in the relays response is one of{" "}
                    <code className="font-mono text-xs text-foreground">
                      &quot;censoring&quot;
                    </code>
                    ,{" "}
                    <code className="font-mono text-xs text-foreground">
                      &quot;neutral&quot;
                    </code>
                    , or{" "}
                    <code className="font-mono text-xs text-foreground">
                      &quot;unknown&quot;
                    </code>
                    . See the{" "}
                    <a
                      href="/methodology"
                      className="text-accent-brand hover:underline transition-colors"
                    >
                      methodology page
                    </a>{" "}
                    for the classification criteria.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          {/* Footer note */}
          <div className="py-8">
            <p className="font-mono text-[11px] text-fg-muted leading-relaxed">
              Found a bug or want to request a new endpoint?{" "}
              <a
                href="https://github.com/Labrys-Group/mev-watch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-brand hover:underline transition-colors"
              >
                Open an issue on GitHub
              </a>
              . The full source, including the API route handlers, is
              open-source.
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
