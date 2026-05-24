import { SectionHeaderSkeleton } from "@/components/skeletons/composition.skeleton";

/**
 * Loading placeholder for <TrendChart>. Mirrors the recessed chart well
 * — 3-col stat header, range toggle + legend row, and the same chart
 * height (260px / 300px sm+) so the page doesn't reflow on data arrival.
 */
export function TrendChartSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        <div className="border border-border-labrys bg-background">
          {/* 3-col stat header */}
          <div className="grid grid-cols-3 border-b border-border-labrys">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`p-3 ${i < 2 ? "border-r border-border-labrys" : ""}`}
              >
                <div className="h-[10px] w-12 animate-pulse bg-foreground/10" />
                <div className="mt-1 h-[18px] w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          {/* Range toggle + legend row */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <div className="inline-flex border border-border-labrys">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-[26px] w-12 animate-pulse bg-foreground/10 ${i < 2 ? "border-r border-border-labrys" : ""}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="h-[10px] w-20 animate-pulse bg-foreground/10" />
              <span className="h-[10px] w-16 animate-pulse bg-foreground/10" />
              <span className="h-[10px] w-24 animate-pulse bg-foreground/10" />
            </div>
          </div>
          {/* Chart well — exact same height as the real chart */}
          <div className="h-[260px] px-2 pb-2 pt-4 sm:h-[300px]">
            <div className="h-full w-full animate-pulse bg-foreground/5" />
          </div>
        </div>
      </div>
    </section>
  );
}
