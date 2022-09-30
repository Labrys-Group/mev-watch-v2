import sub from "date-fns/sub";
import getUnixTime from "date-fns/getUnixTime";

export const timeFrames = [
  {
    labe: "All",
    value: getUnixTime(sub(new Date(), { years: 10 })),
  },
  {
    labe: "30d",
    value: getUnixTime(sub(new Date(), { days: 30 })),
  },
  {
    labe: "7d",
    value: getUnixTime(sub(new Date(), { days: 7 })),
  },
  {
    labe: "1h",
    value: getUnixTime(sub(new Date(), { hours: 1 })),
  },
  {
    labe: "5m",
    value: getUnixTime(sub(new Date(), { minutes: 5 })),
  },
];
