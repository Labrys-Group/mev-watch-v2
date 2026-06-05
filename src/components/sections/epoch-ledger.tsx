"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import type { CSSVars } from "@/lib/css";
import type { EpochRow, LedgerData, SlotCell } from "@/lib/live-ledger/types";
import { classifyRelay } from "@/config/relays";

/** Client poll interval. A slot is 12s; 10s keeps the pulse close to real-time. */
export const POLL_MS = 10_000;

type FilledCategory = "censoring" | "neutral" | "nonboost" | "unknown";

const CAT_META: Record<
  FilledCategory,
  { label: string; bg: string; text: string }
> = {
  censoring: { label: "OFAC Censoring", bg: "bg-ofac", text: "text-warn" },
  neutral: { label: "Neutral", bg: "bg-neutral-relay", text: "text-good" },
  // Covers both genuinely locally-built blocks and slots no relay we polled
  // reported on — we stay vague rather than over-claiming "non-MEV-boost".
  nonboost: {
    label: "Relay Unknown / Non-MEV-Boost",
    bg: "bg-non-boost",
    text: "text-fg-muted",
  },
  unknown: {
    label: "Relay Unknown / Non-MEV-Boost",
    bg: "bg-non-boost",
    text: "text-fg-muted",
  },
};

interface HoverState {
  cell: SlotCell;
  epoch: number;
  x: number;
  y: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Locked geometry for one clipped-scroll shift. */
interface ScrollMetrics {
  /** Viewport height to lock during the slide (px) — the steady 4-row height. */
  height: number;
  /** Distance to translate: one row height + the inter-row gap (px). */
  step: number;
}

/**
 * Measure the steady stack for a clipped scroll, reading live DOM. Returns null
 * when there's no layout (jsdom) or motion is disabled — the caller then swaps
 * instantly instead of animating.
 */
function measureScroll(stack: HTMLDivElement | null): ScrollMetrics | null {
  if (prefersReducedMotion() || !stack) return null;
  const first = stack.children[0] as HTMLElement | undefined;
  const second = stack.children[1] as HTMLElement | undefined;
  const height = stack.offsetHeight;
  const rowH = first?.offsetHeight ?? 0;
  if (height === 0 || rowH === 0) return null;
  const gap = second ? parseFloat(getComputedStyle(second).marginTop) || 0 : 0;
  return { height, step: rowH + gap };
}

interface EpochLedgerProps {
  initial: LedgerData;
}

/**
 * The live epoch ledger — the latest 4 epochs as rows of 32 real slots. The
 * top row is the in-progress epoch; it fills slot by slot and, on completion,
 * the whole stack scrolls down one row in a height-locked viewport: a fresh
 * row enters at the top while the oldest clips out the bottom, with the panel
 * height held constant so nothing pulses. Polls `/api/epochs`.
 */
export function EpochLedger({ initial }: EpochLedgerProps) {
  const [data, setData] = useState<LedgerData>(initial);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  // Clipped-scroll shift state. `exiting` is the dropped bottom row, appended
  // to the stack during the slide; `scrollMetrics` locks the viewport height
  // so the layout can't pulse; `scrollRun` flips false→true to start the
  // transition (false = armed/offset up one row, true = sliding into place).
  const [exiting, setExiting] = useState<EpochRow | null>(null);
  const [scrollMetrics, setScrollMetrics] = useState<ScrollMetrics | null>(
    null,
  );
  const [scrollRun, setScrollRun] = useState(false);
  // Bumped whenever the next poll is scheduled; used as a React key to restart
  // the top-of-panel progress bar so it scrubs the wait between fetches.
  const [pollTick, setPollTick] = useState(0);
  // Tap-to-detail on phones produced a tiny floating tooltip on tile-sized
  // tap targets — readers couldn't dismiss it. Gate the interaction behind
  // real hover + pointer support so only true mouse devices wire it up.
  const [hoverEnabled, setHoverEnabled] = useState(false);

  const prevRef = useRef<LedgerData>(initial);
  const staggerNext = useRef(true);
  // Measured to drive the clipped scroll; reads live DOM, never stale state.
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Poll the API immediately on mount, then schedule the next poll only after
  // the current request settles. This prevents slow refreshes from stacking up
  // and competing for the browser main thread when responses land together.
  useEffect(() => {
    let alive = true;
    let timeoutId: number | null = null;
    let controller: AbortController | null = null;
    // Pending clipped-scroll completion timers, cleared on unmount.
    const scrollTimers = new Set<number>();

    const scheduleNextPoll = () => {
      if (!alive) return;
      setPollTick((t) => t + 1);
      timeoutId = window.setTimeout(poll, POLL_MS);
    };

    async function poll() {
      controller = new AbortController();
      try {
        const res = await fetch("/api/epochs", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as LedgerData;
        if (!alive) return;
        setReconnecting(false);

        if (!isSameLedgerVersion(prevRef.current, next)) {
          // A single-epoch rollover drives the clipped scroll; a multi-epoch
          // jump (e.g. a stale tab) re-staggers the grid instead.
          const epochShift =
            next.epochs[0].epoch - prevRef.current.epochs[0].epoch;
          if (epochShift === 1) {
            // Measure the steady 4-row stack BEFORE it re-renders to 5 rows.
            // Null means no layout (jsdom) or reduced motion → swap instantly.
            const metrics = measureScroll(stackRef.current);
            if (metrics) {
              const dropped =
                prevRef.current.epochs[prevRef.current.epochs.length - 1];
              setScrollMetrics(metrics);
              setScrollRun(false);
              setExiting(dropped);
              // Clear once the 550ms slide finishes (+ buffer).
              const t = window.setTimeout(() => {
                scrollTimers.delete(t);
                if (!alive) return;
                setExiting(null);
                setScrollMetrics(null);
                setScrollRun(false);
              }, 700);
              scrollTimers.add(t);
            }
          } else if (epochShift !== 0) {
            staggerNext.current = true;
          }
          prevRef.current = next;
          setData(next);
        }
      } catch (error) {
        if (alive && !isAbortError(error)) setReconnecting(true);
      } finally {
        controller = null;
        scheduleNextPoll();
      }
    }

    void poll();
    return () => {
      alive = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      for (const t of scrollTimers) window.clearTimeout(t);
      controller?.abort();
    };
  }, []);

  // After the armed frame paints (stack offset up one row, no transition),
  // flip to the run state so the transform transition slides it into place.
  useEffect(() => {
    if (exiting === null || scrollMetrics === null) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setScrollRun(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [exiting, scrollMetrics]);

  const stagger = staggerNext.current;
  useEffect(() => {
    staggerNext.current = false;
  });

  const rows = exiting ? [...data.epochs, exiting] : data.epochs;
  const scrolling = exiting !== null && scrollMetrics !== null;
  // Lock the viewport to the steady height + clip while the stack slides, so
  // the extra fifth row never changes the panel's measured height.
  const viewportStyle: CSSProperties = scrolling
    ? { height: scrollMetrics.height, overflow: "hidden" }
    : {};
  // Armed: offset up one row (no transition). Run: slide back to 0 with the
  // transition applied via the --animate class.
  const stackStyle: CSSProperties = scrolling
    ? {
        transform: scrollRun
          ? "translateY(0)"
          : `translateY(-${scrollMetrics.step}px)`,
      }
    : {};

  return (
    <div
      className="relative border border-border-labrys bg-background p-3 sm:p-4"
      onMouseLeave={() => setHover(null)}
    >
      {/* Browser-style poll progress bar — fills over one poll cycle
          (POLL_MS). Restarts when the next request is scheduled. While
          reconnecting it holds full and pulses amber — a stalled-poll signal
          that lives in the existing top edge, so it never changes the panel
          height. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
      >
        <div
          key={pollTick}
          className={`epoch-poll-bar h-full w-full${
            reconnecting ? " epoch-poll-bar--stalled" : ""
          }`}
          style={
            reconnecting
              ? undefined
              : ({ animationDuration: `${POLL_MS}ms` } as CSSVars)
          }
        />
      </div>
      {/* Layout-neutral live region so the stall is still announced. */}
      <span role="status" className="sr-only">
        {reconnecting ? "Reconnecting to live data…" : ""}
      </span>

      <div className="epoch-ledger-viewport" style={viewportStyle}>
        <div
          ref={stackRef}
          className={`epoch-ledger-stack space-y-1${
            scrolling && scrollRun ? " epoch-ledger-stack--animate" : ""
          }`}
          style={stackStyle}
        >
          {/* eslint-disable-next-line react-hooks/refs -- stagger flows from the intentional render-time ref read above */}
          {rows.map((row, rowIdx) => {
            const isExiting = exiting !== null && row === exiting;
            return (
              <EpochRowView
                key={row.epoch}
                row={row}
                rowIdx={isExiting ? data.epochs.length : rowIdx}
                stagger={stagger}
                onHover={setHover}
                hoverEnabled={hoverEnabled}
              />
            );
          })}
        </div>
      </div>

      {hover && <SlotTooltip hover={hover} />}
    </div>
  );
}

function isSameLedgerVersion(prev: LedgerData, next: LedgerData): boolean {
  return prev.headSlot === next.headSlot && prev.fetchedAt === next.fetchedAt;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

interface EpochRowViewProps {
  row: EpochRow;
  rowIdx: number;
  stagger: boolean;
  onHover: (h: HoverState | null) => void;
  hoverEnabled: boolean;
}

function EpochRowView({
  row,
  rowIdx,
  stagger,
  onHover,
  hoverEnabled,
}: EpochRowViewProps) {
  const filled = row.slots.filter((s) => s.category !== "pending").length;
  const nextIdx = row.inProgress
    ? row.slots.findIndex((s) => s.category === "pending")
    : -1;

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-baseline justify-between gap-2 sm:w-[82px] sm:shrink-0 sm:flex-col sm:items-end sm:justify-start sm:gap-0 sm:text-right">
        <div className="font-mono text-[12px] font-semibold leading-none text-foreground">
          {row.epoch.toLocaleString()}
        </div>
        <div
          className={`font-mono text-[8px] uppercase tracking-[0.1em] sm:mt-1 ${
            row.inProgress ? "text-good" : "text-fg-muted"
          }`}
        >
          {row.inProgress ? `● live · ${filled}/32` : "epoch"}
        </div>
      </div>
      {/* 32 slots: 2 rows of 16 on mobile, a single row of 32 from sm up.
          Track widths use explicit calc() instead of 1fr so every column
          resolves to the same fractional pixel value — `1fr` distribution
          rounds inconsistently per track and made tiles look uneven on
          phones, where the rounding is a larger share of each tile. */}
      <div
        className="grid gap-[2px] grid-cols-[repeat(16,calc((100%_-_30px)_/_16))] sm:flex-1 sm:grid-cols-[repeat(32,calc((100%_-_62px)_/_32))]"
        aria-label={`Epoch ${row.epoch}: ${filled} of 32 slots delivered`}
      >
        {row.slots.map((cell, col) => (
          <SlotTile
            key={`${cell.slot}:${cell.category === "pending" ? "p" : "f"}`}
            cell={cell}
            epoch={row.epoch}
            isNext={col === nextIdx}
            delay={stagger ? (rowIdx + col) * 26 : 0}
            popDurationMs={stagger ? 900 : undefined}
            onHover={onHover}
            hoverEnabled={hoverEnabled}
          />
        ))}
      </div>
    </div>
  );
}

interface SlotTileProps {
  cell: SlotCell;
  epoch: number;
  isNext: boolean;
  delay: number;
  popDurationMs?: number;
  onHover: (h: HoverState | null) => void;
  hoverEnabled: boolean;
}

function SlotTile({
  cell,
  epoch,
  isNext,
  delay,
  popDurationMs,
  onHover,
  hoverEnabled,
}: SlotTileProps) {
  const pending = cell.category === "pending";
  const meta = pending ? null : CAT_META[cell.category as FilledCategory];
  const indexTextClass = pending
    ? "text-fg-muted"
    : "text-[#0D0E16]";

  const className = pending
    ? `epoch-cell flex aspect-square items-center justify-center border ${
        isNext
          ? "border-solid border-fg-muted/50"
          : "border-dashed border-border-labrys"
      }`
    : `epoch-tile flex aspect-square cursor-crosshair items-center justify-center transition-[transform,background-color] duration-[500ms] ease-out hover:z-20 hover:scale-[1.55] hover:duration-100 ${meta!.bg}`;

  // Track the cursor itself (not the tile rect) so the tooltip lands beside
  // the pointer rather than pinned to the slot's bottom-centre. Touch devices
  // skip the handlers entirely (no tap-to-detail).
  const showDetail =
    pending || !hoverEnabled
      ? undefined
      : (e: MouseEvent<HTMLDivElement>) => {
          onHover({ cell, epoch, x: e.clientX, y: e.clientY });
        };
  const clearDetail = pending || !hoverEnabled ? () => onHover(null) : undefined;

  // Snapshot `--delay` and `--pop-duration` at mount. The first /api/epochs
  // poll fires within ~100–300ms of mount, which re-renders the parent and
  // flips `stagger` to false — that would change these inline vars on every
  // already-mounted tile. Chrome restarts a running CSS animation when its
  // duration or delay var changes, which made the staggered reveal snap to
  // its end state mid-flight. Freezing the style after mount keeps the
  // initial animation intact; new tiles arriving from later polls get a
  // fresh mount with their own (snappy) values.
  const initialStyle = useMemo<CSSVars>(() => {
    const vars: CSSVars = { "--delay": `${delay}ms` };
    if (popDurationMs !== undefined) {
      vars["--pop-duration"] = `${popDurationMs}ms`;
    }
    return vars;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-time snapshot
  }, []);

  return (
    <div
      className={className}
      style={initialStyle}
      onMouseEnter={showDetail ?? clearDetail}
      onMouseMove={showDetail}
    >
      <span
        className={`hidden font-mono text-[8px] leading-none sm:block ${indexTextClass}`}
      >
        {cell.indexInEpoch}
      </span>
    </div>
  );
}

/** Width used for edge-flip calc — keep in sync with the `max-w-` class. */
const TOOLTIP_W = 280;
/** Generous over-estimate of the tooltip's height for the bottom-edge flip. */
const TOOLTIP_H_EST = 110;
const CURSOR_OFFSET = 14;

function SlotTooltip({ hover }: { hover: HoverState }) {
  const { cell, epoch } = hover;
  const meta =
    cell.category === "pending"
      ? null
      : CAT_META[cell.category as FilledCategory];
  const relayNames = cell.relays.map((id) => classifyRelay(id).name);

  // Default: place to the bottom-right of the cursor. Flip horizontally near
  // the right edge, flip vertically near the bottom edge, and clamp to the
  // viewport so the tooltip never lands off-screen on the opposite edge.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  let left = hover.x + CURSOR_OFFSET;
  let top = hover.y + CURSOR_OFFSET;
  if (left + TOOLTIP_W > vw - 8) left = hover.x - TOOLTIP_W - CURSOR_OFFSET;
  if (top + TOOLTIP_H_EST > vh - 8)
    top = hover.y - TOOLTIP_H_EST - CURSOR_OFFSET;
  if (left < 8) left = 8;
  if (top < 8) top = 8;

  // Portal to document.body so the ancestor <Reveal>'s `transform` and
  // `will-change: transform` don't re-anchor `position: fixed` to the section.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[70] max-w-[280px] border border-border-labrys bg-panel px-3 py-2 font-mono shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
      style={{ left, top }}
    >
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-fg-muted">
        Slot {cell.slot.toLocaleString()} · Epoch {epoch.toLocaleString()}
      </div>
      <div
        className={`mt-0.5 text-[12px] font-semibold ${
          meta ? meta.text : "text-fg-muted"
        }`}
      >
        {meta ? meta.label : "Pending"}
      </div>
      {relayNames.length > 0 && (
        <div className="mt-0.5 text-[10px] tracking-[0.04em] text-fg-muted break-words">
          via {relayNames.join(", ")}
        </div>
      )}
      {cell.valueWei && (
        <div className="mt-0.5 text-[10px] tracking-[0.04em] text-fg-muted">
          {formatEth(cell.valueWei)} ETH · {cell.numTx ?? 0} txns
        </div>
      )}
    </div>,
    document.body,
  );
}

/** Wei (decimal string) → ETH with 4 decimals. */
function formatEth(wei: string): string {
  return (Number(wei) / 1e18).toFixed(4);
}
