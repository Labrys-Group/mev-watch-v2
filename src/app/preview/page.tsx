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
  // row 0
  ["nonboost", "nonboost", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral",
   "neutral", "nonboost", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral",
   "neutral", "ofac", "neutral", "neutral", "neutral", "nonboost", "neutral", "neutral",
   "ofac", "neutral", "neutral", "neutral", "neutral", "ofac", "neutral", "neutral"],
  // row 1
  ["neutral", "neutral", "ofac", "neutral", "neutral", "nonboost", "neutral", "neutral",
   "neutral", "ofac", "neutral", "neutral", "neutral", "neutral", "ofac", "neutral",
   "nonboost", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral", "ofac",
   "neutral", "nonboost", "neutral", "neutral", "neutral", "neutral", "ofac", "neutral"],
  // row 2
  ["neutral", "ofac", "neutral", "neutral", "neutral", "neutral", "ofac", "nonboost",
   "neutral", "neutral", "neutral", "ofac", "neutral", "neutral", "neutral", "nonboost",
   "neutral", "neutral", "ofac", "neutral", "neutral", "neutral", "ofac", "neutral",
   "neutral", "neutral", "ofac", "neutral", "nonboost", "neutral", "neutral", "ofac"],
  // row 3
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

export default function PreviewPage() {
  return (
    <main className="dark flex min-h-screen items-start justify-start bg-background">
      <div
        id="preview-canvas"
        className="relative overflow-hidden bg-background text-foreground"
        style={{ width: 1200, height: 630 }}
      >
        {/* Blueprint grid texture, scoped to the canvas so the screenshot is
            self-contained. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
            WebkitMaskImage:
              "radial-gradient(ellipse 85% 80% at 50% 42%, transparent 34%, #000 92%)",
            maskImage:
              "radial-gradient(ellipse 85% 80% at 50% 42%, transparent 34%, #000 92%)",
          }}
        />

        {/* Top-right purple wash. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 90% at 100% 0%, color-mix(in oklch, var(--accent-color) 55%, transparent) 0%, transparent 60%)",
          }}
        />

        {/* Faint green accent wash from the bottom-left to anchor the panel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 55% at 0% 100%, color-mix(in oklch, var(--accent-alt-color) 20%, transparent) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative flex h-full flex-col px-14 pt-12 pb-10">
          <div>
            <Image
              src="/mev-watch-logo-dark.png"
              alt="MEV Watch"
              width={2280}
              height={584}
              priority
              className="h-[88px] w-auto"
            />
            <p
              className="mt-5 max-w-[720px] font-sans font-bold leading-[1.2] tracking-[-0.01em] text-foreground"
              style={{ fontSize: "30px" }}
            >
              Track Ethereum MEV-Boost relay censorship
              <br />
              and block flow in a public transparency dashboard.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="block h-[3px] w-24 bg-good" />
              <span className="block h-[3px] w-16 bg-accent-brand" />
            </div>
          </div>

          <div className="mt-auto rounded-[var(--radius)] border border-border-labrys bg-background/70 p-4">
            {/* Faint top divider mimicking the live ledger's poll-bar zone. */}
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
      </div>
    </main>
  );
}
