"use client";

import { useState } from "react";
import type { CSSVars } from "@/lib/css";

const TOTAL = 128;
const COLS = 16;

type Category = "censoring" | "neutral" | "nonboost";

const META: Record<Category, { label: string; bg: string; text: string }> = {
  censoring: { label: "OFAC Censoring", bg: "bg-ofac", text: "text-warn" },
  neutral: { label: "Neutral", bg: "bg-neutral-relay", text: "text-good" },
  nonboost: {
    label: "Non-MEV-Boost",
    bg: "bg-non-boost",
    text: "text-fg-muted",
  },
};

interface BlockGridProps {
  censorshipPct: number;
  nonBoostPct: number;
  totalBlocks: number;
}

interface HoverState {
  i: number;
  x: number;
  y: number;
}

/**
 * The latest day's block composition as a 128-tile grid — censoring,
 * neutral, and non-MEV-boost blocks. Hovering a tile reveals its index
 * and the deliveries it represents.
 */
export function BlockGrid({
  censorshipPct,
  nonBoostPct,
  totalBlocks,
}: BlockGridProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const censoringTiles = Math.round((censorshipPct / 100) * TOTAL);
  const nonBoostTiles = Math.round((nonBoostPct / 100) * TOTAL);
  const neutralTiles = Math.max(0, TOTAL - censoringTiles - nonBoostTiles);

  const categoryOf = (i: number): Category =>
    i < censoringTiles
      ? "censoring"
      : i < censoringTiles + neutralTiles
        ? "neutral"
        : "nonboost";

  const perTile = Math.max(1, Math.round(totalBlocks / TOTAL));

  return (
    <div
      className="relative border border-border-labrys bg-background p-4"
      onMouseLeave={() => setHover(null)}
    >
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        aria-label={`Block composition: ${censoringTiles} censoring, ${neutralTiles} neutral, ${nonBoostTiles} non-MEV-boost tiles of ${TOTAL}`}
      >
        {Array.from({ length: TOTAL }).map((_, i) => {
          const cat = categoryOf(i);
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return (
            <div
              key={i}
              className={[
                "tile aspect-square cursor-crosshair transition-transform duration-100 hover:scale-[1.55]",
                META[cat].bg,
                hover?.i === i ? "z-20 ring-1 ring-foreground" : "hover:z-20",
              ].join(" ")}
              style={{ "--delay": `${(row + col) * 15}ms` } as CSSVars}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setHover({ i, x: r.left + r.width / 2, y: r.bottom });
              }}
            />
          );
        })}
      </div>

      {hover !== null && (
        <BlockTooltip
          index={hover.i}
          category={categoryOf(hover.i)}
          perTile={perTile}
          x={hover.x}
          y={hover.y}
        />
      )}
    </div>
  );
}

interface BlockTooltipProps {
  index: number;
  category: Category;
  perTile: number;
  x: number;
  y: number;
}

function BlockTooltip({
  index,
  category,
  perTile,
  x,
  y,
}: BlockTooltipProps) {
  const meta = META[category];
  const left =
    typeof window !== "undefined"
      ? Math.min(Math.max(x, 88), window.innerWidth - 88)
      : x;

  return (
    <div
      className="pointer-events-none fixed z-[70] -translate-x-1/2 border border-border-labrys bg-panel px-3 py-2 font-mono shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
      style={{ left, top: y + 8 }}
    >
      <div className="text-[9.5px] tracking-[0.14em] uppercase text-fg-muted">
        Tile {String(index + 1).padStart(3, "0")} / {TOTAL}
      </div>
      <div className={`mt-0.5 text-[12px] font-semibold ${meta.text}`}>
        {meta.label}
      </div>
      <div className="mt-0.5 text-[10px] tracking-[0.04em] text-fg-muted">
        ≈ {perTile.toLocaleString()} deliveries
      </div>
    </div>
  );
}
