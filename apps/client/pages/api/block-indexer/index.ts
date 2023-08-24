import { getLatestData, slackWebhook } from "api";
import { connect } from "database/dist";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  await connect();

  try {
    console.log("Getting latest relayer data");

    await getLatestData();
  } catch (error: any) {
    console.error(error);
    await slackWebhook(`Failed to fetch latest relayer data: ${error.message}`);
    return res.status(400).end({ error: error as any, success: false });
  }

  res.status(200).send({ success: true });
};
