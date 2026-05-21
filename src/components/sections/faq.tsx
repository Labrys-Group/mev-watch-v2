import { FAQ_ITEMS } from "@/config/faq";
import { Section } from "@/components/section";
import type { CSSVars } from "@/lib/css";

/**
 * FAQ section — server component, pure CSS accordion via native <details>/<summary>.
 * No JavaScript required; no "use client" directive.
 *
 * Section 07 / FAQ — mirrors mockup-b-terminal.html section 07.
 */
export function Faq() {
  return (
    <Section
      label="06 / FAQ"
      title="Frequently asked."
      aside="QUICK ANSWERS // METHODOLOGY LINKED"
    >
      {/* Two-column accordion grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 border border-border-labrys">
        {FAQ_ITEMS.map((item, i) => {
          const isLastRow = i >= FAQ_ITEMS.length - 2;
          const isRightCol = i % 2 === 1;

          return (
            <details
              key={item.q}
              className={[
                "reveal-item group p-[18px_20px] bg-panel transition-colors duration-200 hover:bg-panel-alt/60",
                isLastRow ? "" : "border-b border-border-labrys",
                isRightCol ? "" : "md:border-r md:border-border-labrys",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--delay": `${i * 55}ms` } as CSSVars}
            >
              <summary className="cursor-pointer list-none flex justify-between items-start gap-3 font-sans font-bold text-[15px] text-foreground tracking-[-0.01em] transition-colors duration-200 group-hover:text-accent-brand [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand rounded-sm">
                <span>{item.q}</span>
                {/* [+] closed, [-] open — toggled via CSS */}
                <span
                  className="font-mono text-[11px] text-accent-brand shrink-0 mt-[2px] transition-all duration-200 group-hover:scale-125 before:content-['[+]'] group-open:before:content-['[-]']"
                  aria-hidden="true"
                />
              </summary>
              <p className="font-mono text-[13px] text-fg-muted leading-[1.6] mt-3 mb-0 transition-opacity">
                {item.a}
              </p>
            </details>
          );
        })}
      </div>
    </Section>
  );
}
