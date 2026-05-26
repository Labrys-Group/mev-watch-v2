import { formatRelativeTime } from "./format";

export const STALE_SOURCE_DAY_THRESHOLD_DAYS = 3;

export type DataFreshnessStatus = "fresh" | "stale" | "empty";

export interface DataFreshness {
  status: DataFreshnessStatus;
  sourceDate: string | null;
  sourceAgeDays: number | null;
  generatedAt: Date | null;
  generatedAgeLabel: string | null;
  sourceLabel: string;
}

interface DataFreshnessInput {
  latestDate: string | null;
  generatedAt: Date | null;
  now?: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseSourceDay(sourceDate: string): number {
  return new Date(`${sourceDate}T00:00:00Z`).getTime();
}

export function getDataFreshness({
  latestDate,
  generatedAt,
  now = new Date(),
}: DataFreshnessInput): DataFreshness {
  const generatedAgeLabel = generatedAt ? formatRelativeTime(generatedAt, now) : null;

  if (!latestDate) {
    return {
      status: "empty",
      sourceDate: null,
      sourceAgeDays: null,
      generatedAt,
      generatedAgeLabel,
      sourceLabel: "No daily snapshot available",
    };
  }

  const sourceAgeDays = Math.max(
    0,
    Math.floor((utcDayStart(now) - parseSourceDay(latestDate)) / MS_PER_DAY),
  );

  return {
    status:
      sourceAgeDays > STALE_SOURCE_DAY_THRESHOLD_DAYS ? "stale" : "fresh",
    sourceDate: latestDate,
    sourceAgeDays,
    generatedAt,
    generatedAgeLabel,
    sourceLabel: `Daily snapshot through ${latestDate}`,
  };
}
