/**
 * Loading placeholder for <Composition>. Mirrors the Section frame +
 * epoch-ledger row + legend strip + two stat tiles. The ledger row uses
 * a fixed pixel height matching the real EpochLedger so the page body
 * doesn't jump when data swaps in.
 */
export function CompositionSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        {/* Epoch ledger placeholder — fixed-height row */}
        <div className="border border-border-labrys bg-background p-3">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[120px] animate-pulse bg-foreground/5"
              />
            ))}
          </div>
        </div>
        {/* Legend strip placeholder */}
        <div className="flex items-center gap-4 border border-t-0 border-border-labrys px-4 py-2.5">
          <span className="h-[10px] w-24 animate-pulse bg-foreground/10" />
          <span className="h-[10px] w-20 animate-pulse bg-foreground/10" />
          <span className="h-[10px] w-28 animate-pulse bg-foreground/10" />
        </div>
        {/* Two stat tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="border border-border-labrys bg-background p-3.5"
            >
              <div className="h-[10px] w-36 animate-pulse bg-foreground/10" />
              <div className="mt-2.5 h-[30px] w-24 animate-pulse bg-foreground/10" />
              <div className="mt-1.5 h-[10px] w-28 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Shared Section-frame header skeleton — label + title line + aside slot. */
export function SectionHeaderSkeleton() {
  return (
    <header className="relative flex items-end justify-between gap-4 border-b border-border-labrys px-4 py-3 md:px-5 md:py-3.5">
      <div>
        <div className="h-[10px] w-44 animate-pulse bg-foreground/10" />
        <div className="mt-1.5 h-[18px] w-56 animate-pulse bg-foreground/10 md:h-[21px] md:w-72" />
      </div>
      <div className="hidden sm:block">
        <div className="h-[10px] w-32 animate-pulse bg-foreground/10" />
        <div className="mt-1 h-[10px] w-40 animate-pulse bg-foreground/10" />
      </div>
    </header>
  );
}
