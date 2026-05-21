/**
 * Formats a percentage value (already on a 0-100 scale) for display.
 *
 * @param value - the percentage, e.g. 24 for "24%"
 * @param fractionDigits - decimal places to show (default 1)
 */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}
