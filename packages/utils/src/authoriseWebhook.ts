import { NextApiRequest } from "next";

const authoriseWebhook = (
  req: NextApiRequest,
  secret: undefined | string,
  type: "Bearer" | "Basic"
) => {
  if (!secret) {
    throw new Error("Missing webhook secret");
  }

  if (req.headers.authorization !== `${type} ${secret}`) {
    throw new Error("Unauthorized request to webhook");
  }

  console.info("Authorized request to webhook...");
};

export const authoriseTenderlyWebhook = (req: NextApiRequest) =>
  authoriseWebhook(req, process.env.TENDERLY_WEBHOOK_SECRET, "Bearer");