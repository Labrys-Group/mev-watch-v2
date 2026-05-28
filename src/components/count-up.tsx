"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Target value. */
  value: number;
  /** Fixed decimal places to render. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Animation length in ms. */
  duration?: number;
  className?: string;
}

/**
 * Animates a number from 0 up to `value` the first time it scrolls
 * into view. Server-renders the final value so the figure is correct
 * without JavaScript and free of hydration mismatches.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1500,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;

    // After the intro count-up has played once, subsequent value changes
    // (e.g. the trend-chart range toggle) snap to the new value instead
    // of re-triggering the scroll-into-view animation.
    if (started.current) {
      setDisplay(value);
      return;
    }

    const run = () => {
      if (started.current) return;
      started.current = true;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplay(value);
        return;
      }

      const start = performance.now();
      setDisplay(0);
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) rafId = requestAnimationFrame(frame);
        else setDisplay(value);
      };
      rafId = requestAnimationFrame(frame);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      // Cancel any in-flight intro animation so a value change mid-frame
      // (e.g. clicking a trend-chart range tab while the count-up is still
      // running) doesn't get overwritten by the next frame using the stale
      // target captured in the RAF closure.
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [value, duration]);

  const text =
    prefix +
    display.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix;

  return (
    <span ref={ref} className={`tabular-nums${className ? ` ${className}` : ""}`}>
      {text}
    </span>
  );
}
