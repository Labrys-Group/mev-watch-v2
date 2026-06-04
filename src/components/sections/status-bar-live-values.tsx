"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

interface UpdatedAgeProps {
  generatedAt: string | null;
  fallback: string;
}

export function UpdatedAge({ generatedAt, fallback }: UpdatedAgeProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(id);
  }, []);

  const value = getUpdatedAgeLabel(generatedAt, now, fallback);

  return <span suppressHydrationWarning>{value}</span>;
}

interface SourceDayProps {
  value: string;
}

export function SourceDay({ value }: SourceDayProps) {
  return <span suppressHydrationWarning>{formatSourceDay(value)}</span>;
}

function getUpdatedAgeLabel(
  generatedAt: string | null,
  now: Date,
  fallback: string,
): string {
  if (!generatedAt) return fallback;

  const generatedAtDate = new Date(generatedAt);
  if (Number.isNaN(generatedAtDate.getTime())) return fallback;
  if (generatedAtDate.getTime() > now.getTime()) return "Clock skew";

  return formatRelativeTime(generatedAtDate, now);
}

function formatSourceDay(value: string): string {
  if (value === "—") return value;

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}
