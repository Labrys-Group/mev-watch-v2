"use client";

import { useEffect, useRef, useState } from "react";
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
const COLS = 32;

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

  const prevRef = useRef<LedgerData>(initial);
  const staggerNext = useRef(true);

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
      className="relative border border-border-labrys bg-background p-4"
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
}

function EpochRowView({ row, rowIdx, stagger, onHover }: EpochRowViewProps) {
  const filled = row.slots.filter((s) => s.category !== "pending").length;
  const nextIdx = row.inProgress
    ? row.slots.findIndex((s) => s.category === "pending")
    : -1;

  return (
    <div className="flex items-center gap-3">
      <div className="w-[82px] shrink-0 text-right">
        <div className="font-mono text-[12px] font-semibold leading-none text-foreground">
          {row.epoch.toLocaleString()}
        </div>
        <div
          className={`mt-1 font-mono text-[8px] uppercase tracking-[0.1em] ${
            row.inProgress ? "text-good" : "text-fg-muted"
          }`}
        >
          {row.inProgress ? `● live · ${filled}/32` : "epoch"}
        </div>
      </div>
      <div
        className="grid flex-1 gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
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
}

function SlotTile({ cell, epoch, isNext, delay, onHover }: SlotTileProps) {
  const pending = cell.category === "pending";
  const meta = pending ? null : CAT_META[cell.category as FilledCategory];

  const className = pending
    ? `epoch-cell flex aspect-square items-center justify-center border ${
        isNext
          ? "border-solid border-fg-muted/50"
          : "border-dashed border-border-labrys"
      }`
    : `epoch-tile flex aspect-square cursor-crosshair items-center justify-center transition-transform duration-100 hover:z-20 hover:scale-[1.55] ${meta!.bg}`;

  return (
    <div
      className={className}
      style={{ "--delay": `${delay}ms` } as CSSVars}
      onMouseEnter={
        pending
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onHover({ cell, epoch, x: r.left + r.width / 2, y: r.bottom });
            }
      }
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

function SlotTooltip({ hover }: { hover: HoverState }) {
  const { cell, epoch } = hover;
  const meta =
    cell.category === "pending"
      ? null
      : CAT_META[cell.category as FilledCategory];
  const left =
    typeof window !== "undefined"
      ? Math.min(Math.max(hover.x, 110), window.innerWidth - 110)
      : hover.x;
  const relayNames = cell.relays.map((id) => classifyRelay(id).name);

  return (
    <div
      className="pointer-events-none fixed z-[70] -translate-x-1/2 border border-border-labrys bg-panel px-3 py-2 font-mono shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
      style={{ left, top: hover.y + 8 }}
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
        <div className="mt-0.5 text-[10px] tracking-[0.04em] text-fg-muted">
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
