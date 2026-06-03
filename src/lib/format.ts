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
  const secs = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Formats an ISO date string ("2022-11-14") as "Nov '22". */
export function formatDateShort(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${MONTHS[Number(month) - 1]} '${year.slice(2)}`;
}

/** Formats an ISO date string ("2022-11-14") as "Mon · 14 Nov 2022".
 *  Parses in UTC because daily snapshots are stored as UTC days — local
 *  parsing would shift the weekday for users west of UTC. */
export function formatDateLong(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${DAYS[d.getUTCDay()]} · ${day} ${MONTHS[month - 1]} ${year}`;
}
