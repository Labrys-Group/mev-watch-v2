"use client";

import { useState } from "react";
import { FAQ_ITEMS, type FaqItem } from "@/config/faq";
import { Section } from "@/components/section";
import type { CSSVars } from "@/lib/css";

/**
 * FAQ section — Section 06 / FAQ.
 *
 * Animation uses the grid-template-rows: 0fr → 1fr trick, which works in
 * every modern browser without needing the newer `interpolate-size` or
 * `::details-content` features.
 */

function FaqCard({
  item,
  index,
  isLastRow,
  isRightCol,
}: {
  item: FaqItem;
  index: number;
  isLastRow: boolean;
  isRightCol: boolean;
}) {
  const [open, setOpen] = useState(false);
  const contentId = `faq-${index}-content`;

  return (
    <div
      className={[
        "reveal-item group bg-panel transition-colors duration-200 hover:bg-panel-alt/60",
        isLastRow ? "" : "border-b border-border-labrys",
        isRightCol ? "" : "md:border-r md:border-border-labrys",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--delay": `${index * 55}ms` } as CSSVars}
    >
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
      <div
        id={contentId}
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 260ms ease-out",
        }}
      >
        <div className="overflow-hidden">
          {open ? (
            <p className="font-mono text-[12.5px] text-fg-muted leading-[1.6] px-4 pb-4 mt-0 mb-0">
              {item.a}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <Section
      label="06 / FAQ"
      title="Frequently asked."
      aside="QUICK ANSWERS // METHODOLOGY LINKED"
      pattern="line-grid"
      accent="var(--fg-muted)"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 border border-border-labrys">
        {FAQ_ITEMS.map((item, index) => (
          <FaqCard
            key={item.q}
            item={item}
            index={index}
            isRightCol={index % 2 === 1}
            isLastRow={index >= FAQ_ITEMS.length - 2}
          />
        ))}
      </div>
    </Section>
  );
}
