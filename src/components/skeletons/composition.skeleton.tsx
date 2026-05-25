/**
 * Loading placeholder for <Composition>. Mirrors the Section frame, daily
 * composition bands, and two stat tiles.
 */
export function CompositionSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel"
      aria-hidden="true"
    >
      <SectionHeaderSkeleton />
      <div className="p-4 md:p-5">
        {/* Composition bands */}
        <div className="grid grid-cols-1 border border-border-labrys bg-background sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-border-labrys p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <div className="h-[10px] w-32 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-[30px] w-24 animate-pulse bg-foreground/10" />
            </div>
          ))}
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
