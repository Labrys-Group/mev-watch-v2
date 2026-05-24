/**
 * Loading placeholder for <StatusBar>. Matches the real bar's height,
 * grid, and divider geometry so the sticky header never jumps when data
 * swaps in.
 */
export function StatusBarSkeleton() {
  return (
    <div
      className="relative overflow-hidden bg-panel-alt border-b border-border-labrys font-mono text-fg-muted"
      aria-hidden="true"
    >
      <div className="relative z-10 grid grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_repeat(5,1fr)]">
        {/* Logo cell — fixed-width to match the real anchor */}
        <div className="flex items-center border-r border-border-labrys px-3 py-2">
          <span className="block h-[19px] w-[18px] animate-pulse bg-foreground/10" />
        </div>
        {/* 5 status cells; first/third/fifth are md-only on the real bar */}
        <SkeletonCell mdOnly />
        <SkeletonCell />
        <SkeletonCell mdOnly />
        <SkeletonCell />
        <SkeletonCell mdOnly isLast />
      </div>
    </div>
  );
}

function SkeletonCell({ mdOnly, isLast }: { mdOnly?: boolean; isLast?: boolean }) {
  const visibility = mdOnly ? "hidden md:flex" : "flex";
  const divider = isLast ? "" : " border-r border-border-labrys";
  return (
    <div
      className={`${visibility} justify-between items-center gap-3 px-3 py-2${divider}`}
    >
      <span className="block h-[10px] w-12 animate-pulse bg-foreground/10" />
      <span className="block h-[12px] w-16 animate-pulse bg-foreground/10" />
    </div>
  );
}
