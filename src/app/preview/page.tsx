import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

type Cell = "neutral" | "ofac" | "nonboost";

// Deterministic 4×32 pattern. Mostly neutral with a steady sprinkle of OFAC
// red and non-boost grey — same distribution shape the live ledger produces,
// so the preview reads as "real data shape" without being live.
const PATTERN: Cell[][] = [
  ["nonboost", "nonboost", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral",
   "neutral", "nonboost", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral",
   "neutral", "ofac", "neutral", "neutral", "neutral", "nonboost", "neutral", "neutral",
   "ofac", "neutral", "neutral", "neutral", "neutral", "ofac", "neutral", "neutral"],
  ["neutral", "neutral", "ofac", "neutral", "neutral", "nonboost", "neutral", "neutral",
   "neutral", "ofac", "neutral", "neutral", "neutral", "neutral", "ofac", "neutral",
   "nonboost", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral", "ofac",
   "neutral", "nonboost", "neutral", "neutral", "neutral", "neutral", "ofac", "neutral"],
  ["neutral", "ofac", "neutral", "neutral", "neutral", "neutral", "ofac", "nonboost",
   "neutral", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral", "nonboost",
   "neutral", "neutral", "ofac", "neutral", "neutral", "neutral", "ofac", "neutral",
   "neutral", "neutral", "ofac", "neutral", "nonboost", "neutral", "neutral", "ofac"],
  ["ofac", "neutral", "neutral", "nonboost", "neutral", "ofac", "neutral", "neutral",
   "ofac", "neutral", "neutral", "neutral", "nonboost", "ofac", "neutral", "neutral",
   "ofac", "neutral", "neutral", "neutral", "ofac", "nonboost", "neutral", "neutral",
   "neutral", "ofac", "neutral", "neutral", "neutral", "neutral", "neutral", "nonboost"],
];

const CELL_CLASS: Record<Cell, string> = {
  neutral: "bg-neutral-relay",
  ofac: "bg-ofac",
  nonboost: "bg-non-boost",
};

/** Tiny L-shaped registration mark — borrowed from blueprint-print conventions. */
function CornerMark({
  corner,
}: {
  corner: "tl" | "tr" | "bl" | "br";
}) {
  const positions: Record<typeof corner, string> = {
    tl: "top-5 left-5",
    tr: "top-5 right-5",
    bl: "bottom-5 left-5",
    br: "bottom-5 right-5",
  };
  const rotations: Record<typeof corner, string> = {
    tl: "",
    tr: "rotate-90",
    bl: "-rotate-90",
    br: "rotate-180",
  };
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${positions[corner]} ${rotations[corner]} h-3 w-3`}
    >
      <span className="absolute left-0 top-0 h-[1.5px] w-3 bg-fg-muted/40" />
      <span className="absolute left-0 top-0 h-3 w-[1.5px] bg-fg-muted/40" />
    </div>
  );
}

export default function PreviewPage() {
  return (
    <main className="dark flex min-h-screen items-start justify-start bg-background">
      <div
        id="preview-canvas"
        className="relative isolate overflow-hidden bg-background text-foreground"
        style={{ width: 1200, height: 630 }}
      >
        {/* Blueprint grid texture, scoped to the canvas. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 85% at 50% 45%, transparent 30%, #000 95%)",
            maskImage:
              "radial-gradient(ellipse 90% 85% at 50% 45%, transparent 30%, #000 95%)",
            opacity: 0.55,
          }}
        />

        {/* Top-right purple beam — the dominant cinematic gradient. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 110% at 105% -10%, color-mix(in oklch, var(--accent-color) 70%, transparent) 0%, color-mix(in oklch, var(--accent-color) 18%, transparent) 35%, transparent 65%)",
          }}
        />

        {/* Bottom-left green accent — anchors the block panel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 65% at -5% 110%, color-mix(in oklch, var(--accent-alt-color) 32%, transparent) 0%, transparent 60%)",
          }}
        />

        {/* Faint diagonal scanlines for engineered texture. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 7px)",
          }}
        />

        {/* Top hairline + bottom hairline — frame the canvas. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--accent-alt-color) 30%, var(--accent-color) 70%, transparent 100%)",
            opacity: 0.6,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-border-labrys"
        />

        {/* Corner registration marks. */}
        <CornerMark corner="tl" />
        <CornerMark corner="tr" />
        <CornerMark corner="bl" />
        <CornerMark corner="br" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col px-14 pt-14 pb-12">
          {/* Mono caption — same pattern the hero uses. */}
          <div className="inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-brand">
            <span aria-hidden="true">{"//"}</span>
            PUBLIC TRANSPARENCY TOOL
            <span
              aria-hidden="true"
              className="ml-1 inline-block h-3 w-[2px] bg-accent-brand"
            />
          </div>

          {/* Logo. */}
          <div className="mt-3">
            <Image
              src="/mev-watch-logo-dark.png"
              alt="MEV Watch"
              width={2280}
              height={584}
              priority
              className="h-[96px] w-auto"
              style={{
                filter:
                  "drop-shadow(0 0 24px color-mix(in oklch, var(--accent-color) 35%, transparent))",
              }}
            />
          </div>

          {/* Tagline. */}
          <p
            className="mt-5 max-w-[760px] font-sans font-bold leading-[1.18] tracking-[-0.015em] text-foreground"
            style={{ fontSize: "30px" }}
          >
            Track Ethereum MEV-Boost relay{" "}
            <span className="text-warn">censorship</span>
            <br />
            and block flow in a{" "}
            <span className="text-good">public transparency</span> dashboard.
          </p>

          {/* Two-tone underline accent. */}
          <div className="mt-5 flex items-center gap-2">
            <span className="block h-[3px] w-28 bg-good" />
            <span className="block h-[3px] w-16 bg-accent-brand" />
            <span className="block h-[3px] w-6 bg-fg-muted/40" />
          </div>

          {/* Block grid panel — terminal-style framing matching the hero
              readme box. */}
          <div className="relative mt-auto border border-border-labrys bg-background/75 p-4 backdrop-blur-[2px]">
            {/* Label tab — sits over the top border like the hero $cat ./readme box. */}
            <span
              aria-hidden="true"
              className="absolute -top-[9px] left-4 bg-background px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-brand"
            >
              {"// LIVE BLOCK FLOW"}
            </span>
            {/* Legend on the opposite corner — three swatches, mono caption. */}
            <span
              aria-hidden="true"
              className="absolute -top-[9px] right-4 flex items-center gap-2 bg-background px-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-fg-muted"
            >
              <span className="flex items-center gap-1">
                <span className="block h-2 w-2 bg-neutral-relay" />
                NEUTRAL
              </span>
              <span className="flex items-center gap-1">
                <span className="block h-2 w-2 bg-ofac" />
                OFAC
              </span>
              <span className="flex items-center gap-1">
                <span className="block h-2 w-2 bg-non-boost" />
                UNKNOWN
              </span>
            </span>

            {/* Faint inner divider — mimics the live ledger's poll-bar strip. */}
            <div className="mb-3 h-[2px] w-full bg-border-labrys" />

            <div className="space-y-[3px]">
              {PATTERN.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="grid gap-[3px]"
                  style={{ gridTemplateColumns: "repeat(32, 1fr)" }}
                >
                  {row.map((cat, colIdx) => (
                    <div
                      key={colIdx}
                      className={`aspect-square ${CELL_CLASS[cat]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* URL stamp — sits over the bottom hairline, right-aligned. */}
        <div className="pointer-events-none absolute bottom-3 right-6 z-10 font-mono text-[11px] tracking-[0.12em] text-fg-muted">
          mevwatch.info{" "}
          <span className="text-accent-brand">→</span>
        </div>
      </div>
    </main>
  );
}
