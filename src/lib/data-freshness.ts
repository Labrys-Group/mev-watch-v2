import { formatRelativeTime } from "./format";

export const FRESH_SOURCE_DAY_THRESHOLD_DAYS = 1;
export const STALE_SOURCE_DAY_THRESHOLD_DAYS = 1.5;

export type DataFreshnessStatus = "fresh" | "stale" | "lagging" | "empty";

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
  const generatedAgeMs = generatedAt ? now.getTime() - generatedAt.getTime() : null;
  const generatedAgeLabel =
    generatedAt && generatedAgeMs !== null && generatedAgeMs >= 0
      ? formatRelativeTime(generatedAt, now)
      : null;

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
    (now.getTime() - parseSourceDay(latestDate)) / MS_PER_DAY,
  );
  const expectedSourceDay = utcDayStart(now) - MS_PER_DAY;
  const sourceLagDays =
    (expectedSourceDay - parseSourceDay(latestDate)) / MS_PER_DAY;
  const expectedSourceAgeDays = (now.getTime() - expectedSourceDay) / MS_PER_DAY;
  const status =
    sourceLagDays <= 0
      ? "fresh"
      : sourceLagDays <= FRESH_SOURCE_DAY_THRESHOLD_DAYS &&
          expectedSourceAgeDays < STALE_SOURCE_DAY_THRESHOLD_DAYS
        ? "lagging"
        : "stale";

  return {
    status,
    sourceDate: latestDate,
    sourceAgeDays,
    generatedAt,
    generatedAgeLabel,
    sourceLabel: `Daily snapshot through ${latestDate}`,
  };
}
