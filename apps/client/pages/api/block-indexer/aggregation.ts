import { NextApiRequest, NextApiResponse } from "next";
import { connect } from "database/dist";
import { DATE_OF_MERGE } from "consts";

import {
  recursivelyPopulateAggregateData,
  slackWebhook,
} from "../../../helpers/apiHelpers";
import { authoriseTenderlyWebhook } from "../../../helpers/apiHelpers/webhooks/authoriseWebhook";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  authoriseTenderlyWebhook(req);
  await connect();

  try {
    console.log("Running Aggregation Job");
    await recursivelyPopulateAggregateData(DATE_OF_MERGE);
  } catch (error: any) {
    console.error(error);
    await slackWebhook(`Failed to complete aggregation: ${error.message}`);
    return res.status(400).end({ error: error as any, success: false });
  }
};
