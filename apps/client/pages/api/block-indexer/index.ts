import { connect } from "database/dist";
import { NextApiRequest, NextApiResponse } from "next";
import { slackWebhook, getLatestData } from "../../../helpers/apiHelpers";
import { authoriseTenderlyWebhook } from "../../../helpers/apiHelpers/webhooks/authoriseWebhook";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  authoriseTenderlyWebhook(req);

  try {
    await connect();
  } catch (error: any) {
    console.error("Error connecting to the database:", error.message);
    await slackWebhook(`Failed to connect to the database: ${error.message}`);
    return res.status(500).send({ error: error as any, success: false });
  }

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
