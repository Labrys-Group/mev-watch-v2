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
    const updateNow = () => {
      setNow(new Date());
    };
    const timeoutId = window.setTimeout(updateNow, 0);
    const intervalId = window.setInterval(updateNow, 60 * 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const value = getUpdatedAgeLabel(generatedAt, now, fallback);

  return <span suppressHydrationWarning>{value}</span>;
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
