import { ActionFn, Context, Event, BlockEvent } from "@tenderly/actions";
import axios from "axios";

/**
 * Hit the mev-watch API once per block to trigger indexing of beacon chain data
 */
export const blockIndexerActionFn: ActionFn = async (
  context: Context,
  event: Event
) => {
  const blockEvent = event as BlockEvent;

  const SECRET_KEY = await context.secrets.get("SECRET_KEY");
  const API_URL = await context.secrets.get("API_URL");

  // TODO: Refactor to pass in secret key and api url as parameters
  try {
    const mevWatchApi = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${SECRET_KEY}` },
    });

    const parameters = {
      blockNumber: blockEvent.blockNumber,
    };

    await mevWatchApi.post("/block-indexer", parameters);
  } catch (err) {
    const webhook = await context.secrets.get("SLACK_WEBHOOK");

    try {
      if (!webhook) {
        throw Error("Webhook url not set");
      }

      await axios.post(webhook, {
        error: err,
        message: "Failed to trigger block indexer",
      });
    } catch (webhookError) {
      console.error(webhookError);
      console.error(err);
    }
  }
};
