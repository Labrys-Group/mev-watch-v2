import { DATE_OF_MERGE } from "consts";
import { CronJob } from "cron";

import { recursivelyPopulateAggregateData } from "./recursivelyPopulateAggregateData";

const aggregateData = async () => {
  console.log("Running Aggregation Job")
  recursivelyPopulateAggregateData(DATE_OF_MERGE);
};

const aggregationComplete = () => console.log("Aggregation Completed");

export const setupAggregateJob = () => {
  const aggregateJobAM = new CronJob(
    "59 42 6 * * *",
    aggregateData,
    aggregationComplete,
    true,
    undefined,
    null,
    false,
    0
  );
  const aggregateJobPM = new CronJob(
    "59 42 18 * * *",
    aggregateData,
    aggregationComplete,
    true,
    undefined,
    null,
    false,
    0
  );
  console.log("Data Aggregation Setup Complete. Next aggregations at: ");
  console.log({
    am: aggregateJobAM.nextDate().toString(),
    pm: aggregateJobPM.nextDate().toString(),
  });
};
