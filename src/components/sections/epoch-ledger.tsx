"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { LIVE_LEDGER_REFRESH_INTERVAL_MS } from "@/lib/live-ledger/timing";
import type { LedgerData, SlotCell, SlotCategory } from "@/lib/live-ledger/types";

export const EPOCH_LEDGER_POLL_MS = LIVE_LEDGER_REFRESH_INTERVAL_MS;

interface EpochLedgerProps {
  initial: LedgerData;
}

export function EpochLedger({ initial }: EpochLedgerProps) {
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const response = await fetch("/api/epochs", {
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Ledger poll failed: ${response.status}`);
        const next = (await response.json()) as LedgerData;
        if (!alive) return;
        setData(next);
        setStale(false);
      } catch {
        if (alive) setStale(true);
      }
    }

    void poll();
    const interval = window.setInterval(poll, EPOCH_LEDGER_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  const hasCensoring = useMemo(
    () =>
      data.epochs.some((epoch) =>
        epoch.slots.some((slot) => slot.category === "censoring"),
      ),
    [data],
  );

  return (
    <div className="reveal-item mb-5 border border-border-labrys bg-background p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
          <div>
            Live epoch ledger · head slot{" "}
            <span className="text-foreground">{data.headSlot.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-[9px] tracking-[0.12em]">
            Recent slots, independent of the daily snapshot
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
          {stale ? <span className="text-warn">LIVE CACHE STALE</span> : null}
          {data.degradedRelays.length > 0 ? (
            <span className="text-warn">DEGRADED RELAY COVERAGE</span>
          ) : null}
          {hasCensoring ? <span className="text-ofac">CENSORING</span> : null}
        </div>
      </div>

      <div aria-label="Live epoch ledger" className="space-y-1.5">
        {data.epochs.map((epoch, rowIndex) => (
          <div
            key={epoch.epoch}
            aria-label={`Epoch ${epoch.epoch}${epoch.inProgress ? " in progress" : ""}`}
            className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2"
          >
            <div className="text-right font-mono text-[9px] uppercase leading-none tracking-[0.1em] text-fg-muted">
              Epoch
              <br />
              <span className="text-foreground">{epoch.epoch}</span>
            </div>
            <div className="grid grid-cols-[repeat(32,minmax(7px,1fr))] gap-1">
              {epoch.slots.map((slot) => (
                <SlotTile
                  key={slot.slot}
                  rowIndex={rowIndex}
                  slot={slot}
                  isNextPending={
                    epoch.inProgress &&
                    slot.category === "pending" &&
                    slot.slot === data.headSlot + 1
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotTile({
  slot,
  rowIndex,
  isNextPending,
}: {
  slot: SlotCell;
  rowIndex: number;
  isNextPending: boolean;
}) {
  return (
    <div
      title={slotTitle(slot)}
      className={[
        "tile h-4 min-w-0 border text-center font-mono text-[8px] leading-4 tabular-nums transition-transform duration-150 hover:z-10 hover:scale-150",
        categoryClass(slot.category),
        isNextPending ? "animate-pulse" : "",
      ].join(" ")}
      style={
        {
          "--delay": `${(rowIndex + slot.indexInEpoch) * 10}ms`,
        } as CSSProperties
      }
    >
      {slot.category === "pending" ? "" : slot.indexInEpoch}
    </div>
  );
}

function categoryClass(category: SlotCategory): string {
  switch (category) {
    case "censoring":
      return "border-ofac bg-ofac text-ofac-fg";
    case "neutral":
      return "border-neutral-relay bg-neutral-relay text-neutral-relay-fg";
    case "nonboost":
      return "border-non-boost/45 bg-non-boost/35 text-foreground/75";
    case "pending":
      return "border-dashed border-border-labrys bg-transparent text-fg-muted";
  }
}

function slotTitle(slot: SlotCell): string {
  const relays = slot.relays.length > 0 ? slot.relays.join(", ") : "none";
  const blockNumber = slot.blockNumber ? ` · block ${slot.blockNumber}` : "";
  const value = slot.valueWei ? ` · value ${slot.valueWei} wei` : "";
  const txs = typeof slot.numTx === "number" ? ` · tx ${slot.numTx}` : "";
  return `Slot ${slot.slot} · ${slot.category} · relays ${relays}${blockNumber}${value}${txs}`;
}
