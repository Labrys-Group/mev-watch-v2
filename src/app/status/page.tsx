import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Reveal } from "@/components/reveal";
import { getLastRefresh, getLatestStats } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/format";
import { getDataFreshness } from "@/lib/data-freshness";
import {
  OPEN_GRAPH_IMAGE,
  SITE_NAME,
  TWITTER_HANDLE,
  TWITTER_IMAGE,
} from "@/config/seo";

const STATUS_TITLE = "Status";
const STATUS_DESCRIPTION =
  "Status of the MEV Watch SQLite data artifact and its freshness.";

export const metadata: Metadata = {
  title: STATUS_TITLE,
  description: STATUS_DESCRIPTION,
  alternates: {
    canonical: "/status",
  },
  openGraph: {
    type: "website",
    url: "/status",
    siteName: SITE_NAME,
    title: `${STATUS_TITLE} — MEV Watch`,
    description: STATUS_DESCRIPTION,
    locale: "en_US",
    images: [OPEN_GRAPH_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: `${STATUS_TITLE} — MEV Watch`,
    description: STATUS_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [snapshot, latestStats] = await Promise.all([
    getLastRefresh(),
    getLatestStats(),
  ]);
  const freshness = getDataFreshness({
    latestDate: latestStats?.date ?? null,
    generatedAt: snapshot?.ranAt ?? null,
  });
  const isStale = freshness.status === "stale";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[900px] px-4 py-12 md:px-6">
        <Reveal className="mb-10 border-b border-border-labrys pb-8">
          <p className="mb-4 font-mono text-[10.5px] tracking-[0.18em] uppercase text-accent-brand">
            {"// status"}
          </p>
          <h1 className="m-0 font-sans text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Data snapshot status
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-fg-muted">
            MEV Watch serves a SQLite data artifact. A scheduled Vercel Cron
            job refreshes the artifact and publishes the latest copy to Vercel
            Blob. Daily aggregate freshness is based on the latest source day,
            not the time this artifact was generated.
          </p>
        </Reveal>

        <Reveal className="py-8">
          <h2 className="mb-6 font-sans text-2xl font-bold tracking-tight text-foreground">
            Current snapshot
          </h2>

          <div className="divide-y divide-border-labrys border border-border-labrys bg-panel">
            <StatusRow label="Latest source day">
              {latestStats ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-mono text-sm text-foreground">
                    {latestStats.date}
                  </span>
                  <span className="font-mono text-xs text-fg-muted">
                    {formatRelativeTime(new Date(`${latestStats.date}T00:00:00Z`))}
                  </span>
                  <span
                    className={`font-mono text-xs uppercase tracking-[0.12em] ${
                      isStale ? "text-warn" : "text-good"
                    }`}
                  >
                    {isStale
                      ? `Daily data stale (${freshness.sourceAgeDays}d old)`
                      : "Daily data fresh"}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-sm text-fg-muted">
                  No daily snapshots available
                </span>
              )}
            </StatusRow>

            <StatusRow label="Generated">
              {snapshot ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-mono text-sm text-foreground">
                    {formatRelativeTime(snapshot.ranAt)}
                  </span>
                  <span className="font-mono text-xs text-fg-muted">
                    {snapshot.source}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-sm text-fg-muted">
                  Snapshot has not been generated yet
                </span>
              )}
            </StatusRow>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-8 px-5 py-4">
      <span className="self-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
