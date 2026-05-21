import { FAQ_ITEMS } from "@/config/faq";

/**
 * FAQ section — server component, pure CSS accordion via native <details>/<summary>.
 * No JavaScript required; no "use client" directive.
 *
 * Section 06 / FAQ — mirrors mockup-b-terminal.html section 06.
 */
export function Faq() {
  return (
    <section className="py-12 border-b border-border-labrys">
      {/* Section header */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-muted mb-2">
            06 / FAQ
          </div>
          <h2 className="font-sans font-bold text-[34px] leading-[1.05] tracking-[-0.02em] text-foreground m-0">
            Frequently asked.
          </h2>
        </div>
        <div className="text-right font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-muted leading-relaxed">
          QUICK ANSWERS // METHODOLOGY LINKED
        </div>
      </div>

      {/* Two-column accordion grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 border border-border-labrys">
        {FAQ_ITEMS.map((item, i) => {
          const isLastRow = i >= FAQ_ITEMS.length - 2;
          const isRightCol = i % 2 === 1;

          return (
            <details
              key={item.q}
              className={[
                "group p-[18px_20px] bg-panel",
                isLastRow ? "" : "border-b border-border-labrys",
                isRightCol ? "" : "md:border-r md:border-border-labrys",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <summary className="cursor-pointer list-none flex justify-between items-start gap-3 font-sans font-bold text-[15px] text-foreground tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                {/* [+] closed, [-] open — toggled via CSS */}
                <span
                  className="font-mono text-[11px] text-accent-brand shrink-0 mt-[2px] before:content-['[+]'] group-open:before:content-['[-]']"
                  aria-hidden="true"
                />
              </summary>
              <p className="font-mono text-[13px] text-fg-muted leading-[1.6] mt-3 mb-0">
                {item.a}
              </p>
            </details>
          );
        })}
      </div>
    </section>
  );
}
