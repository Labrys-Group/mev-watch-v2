import { formatRelativeTime } from "./format";

export const STALE_SOURCE_DAY_THRESHOLD_DAYS = 1;
export const LAGGING_REFRESH_THRESHOLD_HOURS = 36;

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
const MS_PER_HOUR = 60 * 60 * 1000;

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
    Math.floor((utcDayStart(now) - parseSourceDay(latestDate)) / MS_PER_DAY),
  );
  const generatedAgeHours =
    generatedAgeMs === null ? null : generatedAgeMs / MS_PER_HOUR;
  const status =
    sourceAgeDays > STALE_SOURCE_DAY_THRESHOLD_DAYS
      ? "stale"
      : generatedAgeHours === null ||
          generatedAgeHours < 0 ||
          generatedAgeHours > LAGGING_REFRESH_THRESHOLD_HOURS
        ? "lagging"
        : "fresh";

  return {
    status,
    sourceDate: latestDate,
    sourceAgeDays,
    generatedAt,
    generatedAgeLabel,
    sourceLabel: `Daily snapshot through ${latestDate}`,
  };
}
