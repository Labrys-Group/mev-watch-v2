import type { CSSProperties, ReactNode } from "react";

type HeaderPattern = "line-grid" | "diagonal-hatch" | "ticks" | "arcs";

interface SectionProps {
  /** Mono label, e.g. "01 / POST-MERGE COMPOSITION". */
  label: string;
  /** Section heading. */
  title: ReactNode;
  /** Optional right-aligned meta shown in the header strip. */
  aside?: ReactNode;
  /** Top-right ornament style. Omit for no ornament. */
  pattern?: HeaderPattern;
  /** CSS color (preferably a `var(--…)` token) for the ornament. Defaults to muted. */
  accent?: string;
  children: ReactNode;
}

// Linear fade from the top-right corner. Two mask layers composed via
// `intersect` (multiplied): horizontally from right→transparent at the
// ornament's left edge (~middle of header), and vertically from top→0 at
// the bottom edge. Peak alpha at the top-right corner is 1; combined with
// the layer's 0.6 opacity, peak visible intensity is 0.6.
const FADE_MASK_IMAGE =
  "linear-gradient(to left, black, transparent), linear-gradient(to bottom, black, transparent)";

const PATTERNS: Record<
  HeaderPattern,
  { style: CSSProperties; width: string }
> = {
  "line-grid": {
    style: {
      backgroundImage:
        "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
      backgroundSize: "18px 18px",
      backgroundPosition: "top right",
    },
    width: "55%",
  },
  "diagonal-hatch": {
    style: {
      backgroundImage:
        "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 7px)",
    },
    width: "55%",
  },
  ticks: {
    style: {
      backgroundImage:
        "repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px 6px)",
    },
    width: "55%",
  },
  arcs: {
    style: {
      backgroundImage:
        "repeating-radial-gradient(circle at top right, currentColor 0 1px, transparent 1px 12px)",
    },
    width: "60%",
  },
};

const ORNAMENT_OPACITY = 0.2;

/**
 * A solid, contained section panel: a bordered `bg-panel` card with a header
 * strip (label + title + optional aside) above a padded body. An optional
 * `pattern` + `accent` adds a soft, color-tinted grid/hatch ornament in the
 * header's top-right corner.
 */
export function Section({
  label,
  title,
  aside,
  pattern,
  accent,
  children,
}: SectionProps) {
  const ornament = pattern ? PATTERNS[pattern] : null;
  const ornamentStyle: CSSProperties | undefined = ornament
    ? {
        color: accent ?? "var(--fg-muted)",
        width: ornament.width,
        height: "100%",
        opacity: ORNAMENT_OPACITY,
        WebkitMaskImage: FADE_MASK_IMAGE,
        WebkitMaskComposite: "source-in",
        maskImage: FADE_MASK_IMAGE,
        maskComposite: "intersect",
        ...ornament.style,
      }
    : undefined;

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border-labrys bg-panel">
      <header className="relative flex items-end justify-between gap-4 border-b border-border-labrys px-4 py-3 md:px-5 md:py-3.5">
        {ornamentStyle ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 z-0"
            style={ornamentStyle}
          />
        ) : null}
        <div className="relative z-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
            {label}
          </div>
          <h2 className="mt-1.5 font-sans text-lg font-bold leading-tight tracking-tight text-foreground md:text-[21px]">
            {title}
          </h2>
        </div>
        {aside ? (
          <div className="relative z-10 hidden text-right font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.12em] text-fg-muted sm:block">
            {aside}
          </div>
        ) : null}
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}
