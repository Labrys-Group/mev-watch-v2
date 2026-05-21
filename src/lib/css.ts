import type { CSSProperties } from "react";

/**
 * `CSSProperties` widened to accept CSS custom properties (`--vars`),
 * which the motion utilities in `globals.css` read for stagger delays.
 */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
