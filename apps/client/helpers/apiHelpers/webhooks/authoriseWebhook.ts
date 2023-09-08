import { NextApiRequest } from "next";

/**
 * Validates an incoming webhook request by checking its authorization header against the expected secret.
 *
 * @param {NextApiRequest} req - The incoming request object from Next.js API route.
 * @param {undefined|string} secret - The secret token/key to validate against. It may be undefined in some cases but will throw an error if so.
 * @param {"Bearer"|"Basic"} type - The type of authentication used, either 'Bearer' or 'Basic'.
 *
 * @throws Will throw an error if the secret is missing or if the request's authorization does not match the expected value.
 *
 * @example
 *   // If you have a webhook that requires Bearer token authorization:
 *   authoriseWebhook(req, "mySuperSecretToken", "Bearer");
 *
 * @returns {void}
 */
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

/**
 * Specific function to authorize a Tenderly webhook based on environment variable for the secret.
 * Assumes the use of a 'Bearer' token in the authorization header.
 *
 * @param {NextApiRequest} req - The incoming request object from Next.js API route.
 *
 * @throws Will throw an error if the authorization is invalid.
 *
 * @returns {void}
 */
export const authoriseTenderlyWebhook = (req: NextApiRequest) =>
  authoriseWebhook(req, process.env.TENDERLY_WEBHOOK_SECRET, "Bearer");

export const authoriseCronJob = (req: NextApiRequest) => {
  const authorization = req.query.auth as string;
  if (authorization !== process.env.TENDERLY_WEBHOOK_SECRET) {
    throw new Error("Unauthorized request to webhook");
  }
};
