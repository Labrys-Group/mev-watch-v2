import { Suspense } from "react";
import type { ReactNode } from "react";

import { StatusBarSkeleton } from "@/components/skeletons/status-bar.skeleton";
import { SiteHeader } from "@/components/sections/site-header";
import { StatusBarData } from "@/components/sections/status-bar.data";

// Re-rendered hourly; the refresh job updates the underlying data.
export const revalidate = 3600;

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      {/* Status bar + nav stay pinned together across site route transitions. */}
      <div className="sticky top-0 z-50">
        <Suspense fallback={<StatusBarSkeleton />}>
          <StatusBarData />
        </Suspense>
        <SiteHeader />
      </div>
      {children}
    </>
  );
}
