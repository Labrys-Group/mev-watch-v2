import sub from "date-fns/sub";
import getUnixTime from "date-fns/getUnixTime";

// TODO: theres a duplicate type, fix it later
export interface TimeFrame {
  label: string;
  value: number;
}

export const timeFrames: TimeFrame[] = [
  {
    label: "All",
    value: getUnixTime(sub(new Date(), { years: 10 })),
  },
  {
    label: "30d",
    value: getUnixTime(sub(new Date(), { days: 30 })),
  },
  {
    label: "7d",
    value: getUnixTime(sub(new Date(), { days: 7 })),
  },
  {
    label: "1h",
    value: getUnixTime(sub(new Date(), { hours: 1 })),
  },
  {
    label: "5m",
    value: getUnixTime(sub(new Date(), { minutes: 5 })),
  },
];
