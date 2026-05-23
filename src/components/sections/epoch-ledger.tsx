"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { CSSVars } from "@/lib/css";
import { classifyRelay } from "@/config/relays";
import { diffLedger } from "@/lib/epochs/diff";
import type {
  EpochRow,
  LedgerData,
  SlotCell,
} from "@/lib/epochs/get-live-epochs";

/** Client poll interval. A slot is 12s; 30s surfaces 2-3 new slots per poll. */
export const POLL_MS = 30_000;

type FilledCategory = "censoring" | "neutral" | "nonboost";

const CAT_META: Record<
  FilledCategory,
  { label: string; bg: string; text: string }
> = {
  censoring: { label: "OFAC Censoring", bg: "bg-ofac", text: "text-warn" },
  neutral: { label: "Neutral", bg: "bg-neutral-relay", text: "text-good" },
  nonboost: {
    label: "Non-MEV-Boost",
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

interface EpochLedgerProps {
  initial: LedgerData;
}

/**
 * The live epoch ledger — the latest 4 epochs as rows of 32 real slots. The
 * top row is the in-progress epoch; it fills slot by slot and, on completion,
 * the rows shift down and a fresh row enters at the top. Polls `/api/epochs`.
 */
export function EpochLedger({ initial }: EpochLedgerProps) {
  const [data, setData] = useState<LedgerData>(initial);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [exiting, setExiting] = useState<EpochRow | null>(null);
  const [entering, setEntering] = useState<number | null>(null);
  const [exitCollapsed, setExitCollapsed] = useState(false);
  // Tap-to-detail on phones produced a tiny floating tooltip on tile-sized
  // tap targets — readers couldn't dismiss it. Gate the interaction behind
  // real hover + pointer support so only true mouse devices wire it up.
  const [hoverEnabled, setHoverEnabled] = useState(false);

  const prevRef = useRef<LedgerData>(initial);
  const staggerNext = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Poll the API immediately on mount, then every POLL_MS.
  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const res = await fetch("/api/epochs", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as LedgerData;
        if (!alive) return;
        if (next.relaysOk === 0) {
          setReconnecting(true);
          return;
        }
        setReconnecting(false);

        const changes = diffLedger(prevRef.current, next);
        if (changes.epochShift === 1) {
          const dropped =
            prevRef.current.epochs[prevRef.current.epochs.length - 1];
          setExiting(dropped);
          setExitCollapsed(false);
          setEntering(next.epochs[0].epoch);
          window.setTimeout(() => {
            if (!alive) return;
            setExiting(null);
            setEntering(null);
          }, 650);
        } else if (changes.epochShift !== 0) {
          // A multi-epoch jump (e.g. a stale tab): re-enter with the stagger
          // rather than animate a single shift.
          staggerNext.current = true;
        }

        prevRef.current = next;
        setData(next);
      } catch {
        if (alive) setReconnecting(true);
      }
    }

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // After the collapsed/expanded first frame paints, flip to the target state
  // so the grid-template-rows transition runs.
  useEffect(() => {
    if (entering === null && exiting === null) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setEntering(null);
        setExitCollapsed(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [entering, exiting]);

  const stagger = staggerNext.current;
  useEffect(() => {
    staggerNext.current = false;
  });

  const rows = exiting ? [...data.epochs, exiting] : data.epochs;

  return (
    <div
      className="relative border border-border-labrys bg-background p-3 sm:p-4"
      onMouseLeave={() => setHover(null)}
    >
      <div className="space-y-1">
        {/* eslint-disable react-hooks/refs -- stagger is derived from a write-once ref that resets after each render; this read-during-render is intentional. */}
        {rows.map((row, rowIdx) => {
          const isExiting = exiting !== null && row === exiting;
          const collapsed = isExiting ? exitCollapsed : entering === row.epoch;
          return (
            <div
              key={row.epoch}
              className={`epoch-row-wrap${collapsed ? " epoch-row-wrap--collapsed" : ""}`}
            >
              <EpochRowView
                row={row}
                rowIdx={isExiting ? data.epochs.length : rowIdx}
                stagger={stagger}
                onHover={setHover}
                hoverEnabled={hoverEnabled}
              />
            </div>
          );
        })}
        {/* eslint-enable react-hooks/refs */}
      </div>

      {reconnecting && (
        <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-fg-muted">
          ● Reconnecting…
        </div>
      )}

      {hover && <SlotTooltip hover={hover} />}
    </div>
  );
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
      {/* 32 slots: 2 rows of 16 on mobile, a single row of 32 from sm up. */}
      <div
        className="grid gap-[2px] grid-cols-[repeat(16,minmax(0,1fr))] sm:flex-1 sm:grid-cols-[repeat(32,minmax(0,1fr))]"
        aria-label={`Epoch ${row.epoch}: ${filled} of 32 slots delivered`}
      >
        {row.slots.map((cell, col) => (
          <SlotTile
            key={`${cell.slot}:${cell.category}`}
            cell={cell}
            epoch={row.epoch}
            isNext={col === nextIdx}
            delay={stagger ? (rowIdx + col) * 15 : 0}
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
  onHover: (h: HoverState | null) => void;
  hoverEnabled: boolean;
}

function SlotTile({
  cell,
  epoch,
  isNext,
  delay,
  onHover,
  hoverEnabled,
}: SlotTileProps) {
  const pending = cell.category === "pending";
  const meta = pending ? null : CAT_META[cell.category as FilledCategory];

  const className = pending
    ? `epoch-cell flex aspect-square items-center justify-center border ${
        isNext
          ? "border-solid border-fg-muted/50"
          : "border-dashed border-border-labrys"
      }`
    : `epoch-tile flex aspect-square cursor-crosshair items-center justify-center transition-transform duration-100 hover:z-20 hover:scale-[1.55] ${meta!.bg}`;

  // Track the cursor itself (not the tile rect) so the tooltip lands beside
  // the pointer rather than pinned to the slot's bottom-centre. Touch devices
  // skip the handlers entirely (no tap-to-detail).
  const showDetail =
    pending || !hoverEnabled
      ? undefined
      : (e: MouseEvent<HTMLDivElement>) => {
          onHover({ cell, epoch, x: e.clientX, y: e.clientY });
        };

  return (
    <div
      className={className}
      style={{ "--delay": `${delay}ms` } as CSSVars}
      onMouseEnter={showDetail}
      onMouseMove={showDetail}
    >
      <span
        className={`hidden font-mono text-[8px] leading-none sm:block ${
          pending ? "text-fg-muted" : "text-[#0D0E16]"
        }`}
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
  if (top + TOOLTIP_H_EST > vh - 8) top = hover.y - TOOLTIP_H_EST - CURSOR_OFFSET;
  if (left < 8) left = 8;
  if (top < 8) top = 8;

  return (
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
    </div>
  );
}

/** Wei (decimal string) → ETH with 4 decimals. */
function formatEth(wei: string): string {
  return (Number(wei) / 1e18).toFixed(4);
}
