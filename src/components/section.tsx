import type { ReactNode } from "react";

interface SectionProps {
  /** Mono label, e.g. "01 / POST-MERGE COMPOSITION". */
  label: string;
  /** Section heading. */
  title: ReactNode;
  /** Optional right-aligned meta shown in the header strip. */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * A solid, contained section panel: a bordered `bg-panel` card with a header
 * strip (label + title + optional aside) above a padded body. Homepage
 * sections stack these with a consistent gap.
 */
export function Section({ label, title, aside, children }: SectionProps) {
  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel">
      <header className="flex items-end justify-between gap-4 border-b border-border-labrys px-4 py-3 md:px-5 md:py-3.5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
            {label}
          </div>
          <h2 className="mt-1.5 font-sans text-lg font-bold leading-tight tracking-tight text-foreground md:text-[21px]">
            {title}
          </h2>
        </div>
        {aside ? (
          <div className="hidden text-right font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.12em] text-fg-muted sm:block">
            {aside}
          </div>
        ) : null}
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}
