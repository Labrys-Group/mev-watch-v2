/**
 * Formats a percentage value (already on a 0-100 scale) for display.
 *
 * @param value - the percentage, e.g. 24 for "24%"
 * @param fractionDigits - decimal places to show (default 1)
 */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Human-readable "N{unit} ago" from a past date. `now` is injectable for testing. */
export function formatRelativeTime(then: Date, now: Date = new Date()): string {
  const secs = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats an ISO date string ("2022-11-14") as "Nov '22". */
export function formatDateShort(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${MONTHS[Number(month) - 1]} '${year.slice(2)}`;
}
