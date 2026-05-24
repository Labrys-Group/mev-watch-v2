import type { ReactNode } from "react";
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
        {/* Labrys logo — grayscale, links to labrys.io; on hover the
            wordmark unfurls and shifts the rest of the row across */}
        <a
          href="https://labrys.io"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Built by Labrys — labrys.io"
          className="group flex items-center border-r border-border-labrys px-3 py-2 text-fg-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand focus-visible:ring-inset"
        >
          <div className="w-[18px] overflow-hidden transition-[width] duration-300 ease-out group-hover:w-[74px]">
            <svg
              viewBox="0 0 438 116"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="h-[19px] w-auto max-w-none block shrink-0"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M112 90V20H128V76H157V90H112ZM182 35C189.062 35 194.37 37.5345 198.001 41.977L198 36H214V90H198L198.001 84.023C194.37 88.4655 189.062 91 182 91C167.088 91 160 79.7011 160 63C160 46.2989 167.088 35 182 35ZM187 49C179.544 49 176 54.6495 176 63C176 71.3505 179.544 77 187 77C194.456 77 198 71.3505 198 63C198 54.6495 194.456 49 187 49ZM238 20L238 41.976C241.631 37.5341 246.938 35 254 35C268.912 35 276 46.2989 276 63C276 79.7011 268.912 91 254 91C246.938 91 241.631 88.4659 238 84.024L238 90H222V20H238ZM249 49C241.544 49 238 54.6495 238 63C238 71.3505 241.544 77 249 77C256.456 77 260 71.3505 260 63C260 54.6495 256.456 49 249 49ZM314 35C314.683 35 315.35 35.0237 316.001 35.0706L316.002 49.9791C314.38 49.3409 312.125 49 308.996 49C301.543 49 298 54.6495 298 63V90H282V36H298L298 41.976C301.631 37.5341 306.938 35 314 35ZM320 36L339 90C339 94.4183 335.418 98 331 98H323V112H331.469C340.78 112 349.082 106.139 352.199 97.3648L374 36H357L347 70L337 36H320ZM400 35C411.419 35 419.068 40.4472 422.992 46.0488L411.173 52.7641C408.88 50.0839 404.265 49.0558 399.405 49.0022L399 49C395.024 49 392 49.8593 392 52C392 54.1241 394.851 55.1422 398.429 55.8849L398.999 56.001L399.486 56.0769L400.457 56.2382C414.557 58.6763 421.992 64.3297 421.992 74C421.992 84 414.37 91 397.992 91C386.573 91 378.924 85.5528 375 79.9512L386.819 73.2359C389.176 75.9905 393.985 77 398.992 77L399.553 76.9941C403.249 76.9153 405.992 76.0388 405.992 74C405.992 71.8759 403.141 70.8578 399.563 70.1151L398.991 69.999L398.506 69.9231L397.535 69.7618C383.435 67.3237 376 61.6703 376 52C376 42 383.622 35 400 35Z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.0018 27.2297L32.0009 36.4625L32.0018 64.1609L55.9988 77.9942L56.0048 96.4492L16 73.3809L16.0018 27.2297Z"
                fill="currentColor"
              />
              <path
                opacity="0.7"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M96.0018 27.23L80.0018 36.46V64.1609L56.0049 77.9942L55.9988 96.4492L96.0036 73.3809L96.0018 27.23Z"
                fill="currentColor"
              />
              <path
                opacity="0.5"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.0017 27.2297L32.0017 18L56.0017 32L80.0026 18L96.0017 27.23L56.0048 50.3314L16.0017 27.2297Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </a>

        <StatusCell label="NETWORK" value="ETH MAINNET" mdOnly />

        <StatusCell
          label="STATUS"
          valueClassName="text-good flex items-center gap-1.5"
          value={
            <>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-good mr-1 animate-pulse"
                style={{ boxShadow: "0 0 6px var(--good)" }}
              />
              LIVE
            </>
          }
        />

        <StatusCell label="DATA THROUGH" value={latestDate} mdOnly />

        <StatusCell
          label="CENSORSHIP"
          value={formatPercent(censorshipPct)}
          valueClassName="text-warn"
        />

        <StatusCell label="UPDATED" value={updatedText} mdOnly isLast />
      </div>
    </div>
  );
}

interface StatusCellProps {
  label: string;
  value: ReactNode;
  /** Extra classes layered onto the `<strong>` value. Overrides `text-foreground`
   *  if a colour is provided. */
  valueClassName?: string;
  /** Drops the right-hand divider; use on the final cell in the row. */
  isLast?: boolean;
  /** Hide below the `md` breakpoint. The Labrys logo + STATUS + CENSORSHIP
   *  stay; everything else collapses on narrow screens. */
  mdOnly?: boolean;
}

function StatusCell({ label, value, valueClassName, isLast, mdOnly }: StatusCellProps) {
  const visibility = mdOnly ? "hidden md:flex" : "flex";
  const divider = isLast ? "" : " border-r border-border-labrys";
  return (
    <div
      className={`${visibility} justify-between items-center gap-3 px-3 py-2 text-[12px] tracking-[0.1em] uppercase${divider}`}
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
