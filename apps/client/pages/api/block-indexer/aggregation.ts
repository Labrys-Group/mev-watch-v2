import { NextApiRequest, NextApiResponse } from "next";
import { connect } from "database/dist";
import { recursivelyPopulateAggregateData, slackWebhook } from "database";
import { DATE_OF_MERGE } from "consts";

export default async (req: NextApiRequest, res: NextApiResponse) => {
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
