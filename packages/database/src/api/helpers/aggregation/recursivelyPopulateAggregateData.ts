import { add, isAfter } from "date-fns";

import { AGGREGATION_PERIOD, getAggregateStats } from "./getAggregateStats";
import { saveAggregateStats } from "./saveAggregateStats";

/**
 * Populate DB with aggregated data from start date, every AGGREGATION_PERIOD, to now
 * This will not insert over records which already exist in the db
 * @param startDate The date to start aggregation (ideally this should be the merge date)
 * @returns
 */
export const recursivelyPopulateAggregateData = async (startDate: Date) => {
  const endDate = add(startDate, { hours: AGGREGATION_PERIOD });
  if (isAfter(endDate, new Date())) {
    return;
  }

  const aggregateStats = await getAggregateStats(startDate);
  await saveAggregateStats([aggregateStats]);

  await recursivelyPopulateAggregateData(endDate);
};
