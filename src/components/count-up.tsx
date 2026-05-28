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
 * Animates a number on first scroll-into-view (0 → value), then tweens
 * between subsequent target values from whatever is currently on screen
 * (e.g. the trend-chart NOW / PEAK / TROUGH stats counting up or down
 * when the range tab changes). Server-renders the final value so the
 * figure is correct without JavaScript and free of hydration mismatches.
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
  // Mirror `display` in a ref so a mid-flight tween can read the latest
  // on-screen number when a new target comes in, without re-subscribing
  // the effect on every animation frame.
  const displayRef = useRef(value);
  const started = useRef(false);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;

    const tween = (from: number, to: number) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplay(to);
        return;
      }
      const start = performance.now();
      const delta = to - from;
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + delta * eased);
        if (t < 1) rafId = requestAnimationFrame(frame);
        else setDisplay(to);
      };
      rafId = requestAnimationFrame(frame);
    };

    // After the scroll-into-view intro has played once, value changes
    // (e.g. clicking through trend-chart range tabs) tween from the
    // currently displayed number to the new target rather than snapping
    // or replaying the 0→value reveal.
    if (started.current) {
      tween(displayRef.current, value);
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }

    const run = () => {
      if (started.current) return;
      started.current = true;
      setDisplay(0);
      displayRef.current = 0;
      tween(0, value);
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
