import { connect } from "database/dist";
import { NextApiRequest, NextApiResponse } from "next";
import { getLatestData, sendErrorResponse } from "../../../helpers/apiHelpers";
import { authoriseTenderlyWebhook } from "../../../helpers/apiHelpers/webhooks/authoriseWebhook";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  authoriseTenderlyWebhook(req);

  try {
    await connect();
  } catch (error: any) {
    sendErrorResponse(res, error, "Error connecting to the database:");
    return;
  }

  try {
    console.log("Getting latest relayer data");

    await getLatestData();
  } catch (error: any) {
    sendErrorResponse(res, error, "Failed to fetch latest relayer data:");
    return;
  }

  res.status(200).send({ success: true });
};
