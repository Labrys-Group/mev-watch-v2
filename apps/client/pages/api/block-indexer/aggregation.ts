import { NextApiRequest, NextApiResponse } from "next";
import { connect } from "database/dist";
import { timeOfMerge } from "consts";

import {
  recursivelyPopulateAggregateData,
  slackWebhook,
} from "../../../helpers/apiHelpers";
import { authoriseCronJob } from "../../../helpers/apiHelpers/webhooks/authoriseWebhook";
import { sub } from "date-fns";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.ENABLED_CRON_JOBS !== "true") {
    return res
      .status(400)
      .end({ error: "Cron jobs are not enabled", success: false });
  }

  authoriseCronJob(req);
  await connect();

  try {
    console.log("Running Aggregation Job");
    await recursivelyPopulateAggregateData(sub(timeOfMerge(), { days: 2 }));
  } catch (error: any) {
    console.error(error);
    await slackWebhook(`Failed to complete aggregation: ${error.message}`);
    return res.status(400).end({ error: error as any, success: false });
  }
};
