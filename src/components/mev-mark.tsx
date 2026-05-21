interface MevMarkProps {
  /** Sizing classes for the square mark, e.g. `w-5 h-5`. */
  className?: string;
}

/**
 * MEV Watch brand mark — a 2×2 block glyph that echoes the homepage
 * block-composition grid. Deliberately not the Labrys logo.
 */
export function MevMark({ className }: MevMarkProps) {
  return (
    <div
      className={`grid grid-cols-2 grid-rows-2 gap-[2px] ${className ?? ""}`}
      aria-hidden="true"
    >
      <span className="bg-foreground" />
      <span className="bg-foreground/55" />
      <span className="bg-foreground/55" />
      <span className="bg-accent-brand" />
    </div>
  );
}
