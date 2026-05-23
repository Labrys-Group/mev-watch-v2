"use client";

import { useState } from "react";
import { FAQ_ITEMS, type FaqItem } from "@/config/faq";
import { Section } from "@/components/section";
import type { CSSVars } from "@/lib/css";

/**
 * FAQ section — Section 06 / FAQ.
 *
 * Items are rendered side-by-side in pairs, and each pair shares an open
 * state so the two cells expand and collapse together. That keeps the row
 * heights tidy: a CSS grid row stretches its cells to the tallest one, so
 * opening just one cell used to make its closed neighbour look like it was
 * expanding for no reason.
 *
 * Animation uses the grid-template-rows: 0fr → 1fr trick, which works in
 * every modern browser without needing the newer `interpolate-size` or
 * `::details-content` features.
 */

function FaqPair({
  items,
  startIndex,
  isLastRow,
}: {
  items: FaqItem[];
  startIndex: number;
  isLastRow: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {items.map((item, j) => {
        const isRightCol = j === 1;
        const globalIndex = startIndex + j;
        const contentId = `faq-${globalIndex}-content`;

        return (
          <div
            key={item.q}
            className={[
              "reveal-item group bg-panel transition-colors duration-200 hover:bg-panel-alt/60",
              isLastRow ? "" : "border-b border-border-labrys",
              isRightCol ? "" : "md:border-r md:border-border-labrys",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--delay": `${globalIndex * 55}ms` } as CSSVars}
          >
            {/* Full-row button so the entire cell — text, indicator, and the
                padding around them — is a single, generous click target. */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={contentId}
              className="w-full cursor-pointer flex justify-between items-start gap-3 px-4 py-3.5 text-left font-sans font-bold text-[13.5px] text-foreground tracking-[-0.01em] transition-colors duration-200 group-hover:text-accent-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand"
            >
              <span>{item.q}</span>
              <span
                aria-hidden="true"
                className="font-mono text-[11px] text-accent-brand shrink-0 mt-[2px] transition-transform duration-200 group-hover:scale-125"
              >
                {open ? "[-]" : "[+]"}
              </span>
            </button>
            {/* grid-template-rows trick: collapses the row track to 0fr when
                closed, expands to 1fr (natural content height) when open.
                The inner element needs overflow: hidden so its content is
                clipped during the transition. */}
            <div
              id={contentId}
              className="grid"
              style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                transition: "grid-template-rows 260ms ease-out",
              }}
            >
              <div className="overflow-hidden">
                <p className="font-mono text-[12.5px] text-fg-muted leading-[1.6] px-4 pb-4 mt-0 mb-0">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Faq() {
  // Pair items two-at-a-time so each pair shares an open state.
  const pairs: FaqItem[][] = [];
  for (let i = 0; i < FAQ_ITEMS.length; i += 2) {
    pairs.push(FAQ_ITEMS.slice(i, i + 2));
  }

  return (
    <Section
      label="06 / FAQ"
      title="Frequently asked."
      aside="QUICK ANSWERS // METHODOLOGY LINKED"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 border border-border-labrys">
        {pairs.map((pair, p) => (
          <FaqPair
            key={pair.map((it) => it.q).join("|")}
            items={pair}
            startIndex={p * 2}
            isLastRow={p === pairs.length - 1}
          />
        ))}
      </div>
    </Section>
  );
}
