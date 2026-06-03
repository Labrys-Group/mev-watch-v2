import type { Metadata } from "next";
import { getLatestStats, getStatsSummary } from "@/lib/queries";
import { formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Embed",
  description:
    "Live OFAC censorship rate for Ethereum MEV-boost blocks — embeddable metric card.",
  alternates: {
    canonical: "/embed",
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export const revalidate = 3600;

export default async function EmbedPage() {
  const [latest, summary] = await Promise.all([
    getLatestStats(),
    getStatsSummary(),
  ]);

  if (!latest || !summary) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md border border-border-labrys bg-panel p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
            MEV WATCH
          </p>
          <p className="mt-4 font-mono text-sm text-fg-muted">
            Data unavailable
          </p>
        </div>
      </main>
    );
  }

  const drop = (summary.peak - summary.current).toFixed(1);

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="anim-fade-up w-full max-w-md border border-border-labrys bg-panel p-6">
        {/* Wordmark */}
        <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
          MEV WATCH
        </p>

        {/* Headline metric */}
        <div className="mt-4">
          <p className="font-sans text-6xl font-bold leading-none tracking-tight text-foreground">
            {formatPercent(summary.current)}
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-fg-muted">
            of MEV-boost blocks via OFAC-censoring relays
          </p>
        </div>

        {/* Trend line */}
        <p className="mt-4 font-mono text-sm text-good">
          ▼ down {drop} pts from a {formatPercent(summary.peak)} peak
        </p>

        {/* Divider */}
        <div className="mt-5 border-t border-border-labrys" />

        {/* Footer link */}
        <p className="mt-4 font-mono text-xs text-fg-muted">
          <a
            href="https://mevwatch.info"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-brand transition-colors"
          >
            mevwatch.info →
          </a>
          <span className="ml-2">see the full dashboard</span>
        </p>
      </div>
    </main>
  );
}
