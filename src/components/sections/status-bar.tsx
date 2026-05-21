import { formatPercent, formatRelativeTime } from "@/lib/format";

interface StatusBarProps {
  latestDate: string;
  censorshipPct: number;
  lastRefresh: Date | null;
}

export function StatusBar({ latestDate, censorshipPct, lastRefresh }: StatusBarProps) {
  const updatedText = lastRefresh ? formatRelativeTime(lastRefresh) : "—";

  return (
    <div className="relative overflow-hidden bg-panel-alt border-b border-border-labrys font-mono text-fg-muted">
      {/* Ambient sheen — a slow accent glow sweeping the bar */}
      <div
        aria-hidden="true"
        className="status-sheen pointer-events-none absolute inset-y-0 left-0 z-0 w-1/5"
      />

      {/* Inner row: grid of cells */}
      <div className="relative z-10 grid grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_repeat(5,1fr)]">
        {/* Corner mark — Labrys blurple SVG (decorative) */}
        <div className="flex items-center justify-center px-3.5 py-1.5 border-r border-border-labrys">
          <svg
            viewBox="0 0 71 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="w-5 h-5 block"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.366815 8.68875L14.4011 16.7877L14.4019 41.0845L35.4519 53.219L35.4572 69.4075L0.365234 49.1722L0.366815 8.68875Z"
              fill="#4F0CE5"
            />
            <path
              opacity="0.7"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M70.542 8.689L56.507 16.7855V41.0845L35.457 53.219L35.4517 69.4076L70.5436 49.1722L70.542 8.689Z"
              fill="#4F0CE5"
            />
            <path
              opacity="0.5"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.367188 8.6887L14.4023 0.592438L35.4549 12.8731L56.5083 0.592438L70.5426 8.68893L35.4576 28.9533L0.367188 8.6887Z"
              fill="#4F0CE5"
            />
          </svg>
        </div>

        {/* NETWORK — hidden on small screens, visible from md up */}
        <div className="hidden md:flex justify-between items-center gap-3 px-4 py-2.5 border-r border-border-labrys text-[10.5px] tracking-[0.1em] uppercase">
          <span>NETWORK</span>
          <strong className="text-foreground font-semibold tracking-normal normal-case">
            ETH MAINNET
          </strong>
        </div>

        {/* STATUS — always visible, with pulsing dot */}
        <div className="flex justify-between items-center gap-3 px-4 py-2.5 border-r border-border-labrys text-[10.5px] tracking-[0.1em] uppercase">
          <span>STATUS</span>
          <strong className="text-good font-semibold tracking-normal normal-case flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-good mr-1.5 animate-pulse"
              style={{ boxShadow: "0 0 6px var(--good)" }}
            />
            LIVE
          </strong>
        </div>

        {/* DATA THROUGH — hidden on small screens, visible from md up */}
        <div className="hidden md:flex justify-between items-center gap-3 px-4 py-2.5 border-r border-border-labrys text-[10.5px] tracking-[0.1em] uppercase">
          <span>DATA THROUGH</span>
          <strong className="text-foreground font-semibold tracking-normal normal-case">
            {latestDate}
          </strong>
        </div>

        {/* CENSORSHIP — always visible */}
        <StatusCell
          label="CENSORSHIP"
          value={formatPercent(censorshipPct)}
          valueClassName="text-warn"
        />

        {/* UPDATED — hidden on small screens, visible from md up */}
        <div className="hidden md:flex justify-between items-center gap-3 px-4 py-2.5 text-[10.5px] tracking-[0.1em] uppercase">
          <span>UPDATED</span>
          <strong className="text-foreground font-semibold tracking-normal normal-case">
            {updatedText}
          </strong>
        </div>
      </div>
    </div>
  );
}

interface StatusCellProps {
  label: string;
  value: string;
  valueClassName?: string;
  isLast?: boolean;
}

function StatusCell({ label, value, valueClassName, isLast }: StatusCellProps) {
  return (
    <div
      className={`flex justify-between items-center gap-3 px-4 py-2.5 text-[10.5px] tracking-[0.1em] uppercase${isLast ? "" : " border-r border-border-labrys"}`}
    >
      <span>{label}</span>
      <strong
        className={`text-foreground font-semibold tracking-normal normal-case${valueClassName ? ` ${valueClassName}` : ""}`}
      >
        {value}
      </strong>
    </div>
  );
}
