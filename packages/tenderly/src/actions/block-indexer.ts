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

  const SECRET_KEY = await context.secrets.get("THIRD_PARTY_SECRET_KEY");
  const API_URL = await context.secrets.get("API_URL");

  console.log(SECRET_KEY);

  try {
    const api = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${SECRET_KEY}` },
    });

    const parameters = {
      blockNumber: blockEvent.blockNumber,
    };

    await api.post("/index-stats", parameters);
  } catch (err) {
    const webhook = await context.secrets.get("SLACK_WEBHOOK");

    try {
      if (!webhook) {
        throw Error("Webhook url not set");
      }

      await axios.post(webhook, {
        username: "🤖 ETH Staked Bot",
        text: JSON.stringify(err, null, 4),
        icon_url: "https://www.ethstaked.info/favicon.ico",
      });
    } catch (webhookError) {
      console.error(webhookError);
      console.error(err);
    }
  }
};
