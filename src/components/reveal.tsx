"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CSSVars } from "@/lib/css";

interface RevealProps {
  children: ReactNode;
  /** Extra classes merged onto the reveal wrapper. */
  className?: string;
  /** Delay, in ms, before the reveal transition begins. */
  delay?: number;
}

/**
 * Wraps a section so it fades + lifts into view the first time it
 * enters the viewport. Adds the `is-visible` class, which also gates
 * the secondary animations (`grow-bar`, `tile`, `reveal-row`, …)
 * defined in `globals.css`.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as CSSVars) : undefined}
    >
      {children}
    </div>
  );
}
