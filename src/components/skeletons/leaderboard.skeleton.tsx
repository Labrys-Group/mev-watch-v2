import { SectionHeaderSkeleton } from "@/components/skeletons/composition.skeleton";

const ROWS = 8;

/**
 * Loading placeholder for <Leaderboard>. Five-column table — rank,
 * relay, posture badge, share bar+percent, blocks. Eight rows keeps
 * the section height close to the real list, avoiding reflow on swap.
 */
export function LeaderboardSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        {/* Caption */}
        <div className="mb-3 border-b border-border-labrys pb-3">
          <div className="h-[13px] w-72 animate-pulse bg-foreground/10" />
        </div>
        {/* Table */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="w-full">
            {/* Header strip */}
            <div className="grid grid-cols-[36px_1fr_96px_140px_120px] gap-2 border-b border-t border-border-labrys bg-panel-alt px-2 py-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[10px] w-12 animate-pulse bg-foreground/10"
                />
              ))}
            </div>
            {/* Body rows */}
            {Array.from({ length: ROWS }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[36px_1fr_96px_140px_120px] items-center gap-2 border-b border-border-labrys px-2 py-2.5"
              >
                <span className="h-[12px] w-6 animate-pulse bg-foreground/10" />
                <span className="h-[14px] w-40 animate-pulse bg-foreground/10" />
                <span className="h-[18px] w-16 animate-pulse bg-foreground/10" />
                <span className="h-[6px] w-[88px] animate-pulse bg-foreground/10" />
                <span className="ml-auto h-[12px] w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
