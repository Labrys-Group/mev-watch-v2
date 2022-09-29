/**
 * Simple parser that also strips commas from a number string
 */
export const parseStringToNumber = (value: string) =>
  parseFloat(value.replace(/,/g, ""));
