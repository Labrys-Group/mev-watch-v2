/**
 * Simple parser that also strips commas from a number string
 */
export const parseStringToNumber = (value: string) =>
  parseFloat(value.replace(/,/g, ""));

export const formatNumberForDisplay = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });
