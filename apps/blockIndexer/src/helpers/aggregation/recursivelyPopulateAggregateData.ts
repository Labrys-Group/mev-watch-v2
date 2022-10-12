import { add, isAfter } from "date-fns";

import { AGGREGATION_PERIOD, getAggregateStats } from "./getAggregateStats";
import { saveAggregateStats } from "./saveAggregateStats";

export const recursivelyPopulateAggregateData = async (startDate: Date) => {
  const endDate = add(startDate, { hours: AGGREGATION_PERIOD });
  if (isAfter(endDate, new Date())) {
    return;
  }

  const aggregateStats = await getAggregateStats(startDate);
  await saveAggregateStats([aggregateStats]);

  await recursivelyPopulateAggregateData(endDate);
};
