import { DATE_OF_MERGE } from "consts";
import { connect } from "database";
import { add, isAfter } from "date-fns";

import {
  AGGREGATION_PERIOD,
  getAggregateStats,
} from "../helpers/aggregation/getAggregateStats";
import { saveAggregateStats } from "../helpers/aggregation/saveAggregateStats";

const recursivelyPopulateAggregateData = async (startDate: Date) => {
  const endDate = add(startDate, { hours: AGGREGATION_PERIOD });
  console.log({ startDate, endDate });
  if (isAfter(endDate, new Date())) {
    console.log("period exceeded")
    return;
  }

  const aggregateStats = await getAggregateStats(startDate);
  await saveAggregateStats([aggregateStats]);

  await recursivelyPopulateAggregateData(endDate);
};

const main = async () => {
  await connect();

  await recursivelyPopulateAggregateData(DATE_OF_MERGE);

  process.exit(0);
};

main();
