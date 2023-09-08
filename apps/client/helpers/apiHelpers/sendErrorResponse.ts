import { NextApiResponse } from "next";
import { slackWebhook } from "./indexing";

// Helper function to send error responses
export const sendErrorResponse = (
  res: NextApiResponse,
  error: any,
  message: string,
  statusCode = 500
) => {
  console.error(message, error.message);
  slackWebhook(message);
  res.status(statusCode).send({ error: error.message, success: false });
};
