/**
 * Loading placeholder for <Hero>. Matches the verdict-coloured frame's
 * outer dimensions (border + padding + lg two-column grid) so swapping
 * to the real hero never shifts the layout below.
 */
export function HeroSkeleton() {
  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel p-5 md:p-8"
      aria-hidden="true"
    >
      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
        {/* Left column — tag + headline */}
        <div>
          <div className="mb-4 h-[14px] w-48 animate-pulse bg-foreground/10" />
          <div className="space-y-3">
            <div className="h-[clamp(2.4rem,6.7vw,3.85rem)] w-full max-w-[420px] animate-pulse bg-foreground/10" />
            <div className="h-[clamp(2.4rem,6.7vw,3.85rem)] w-3/4 max-w-[320px] animate-pulse bg-foreground/10" />
          </div>
        </div>

        {/* Right column — stat card + readme */}
        <div className="flex h-full flex-col gap-5">
          {/* Stat card — 2px frame placeholder */}
          <div className="flex items-center gap-x-4 border-2 border-border-labrys bg-panel p-4">
            <span className="block h-[clamp(1.7rem,3.4vw,2.1rem)] w-24 shrink-0 animate-pulse bg-foreground/10" />
            <span className="block h-[14px] flex-1 animate-pulse bg-foreground/10" />
          </div>
          {/* Readme box */}
          <div className="mt-auto border border-border-labrys bg-panel p-4">
            <div className="space-y-2">
              <div className="h-[14px] w-full animate-pulse bg-foreground/10" />
              <div className="h-[14px] w-[92%] animate-pulse bg-foreground/10" />
              <div className="h-[14px] w-[60%] animate-pulse bg-foreground/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
