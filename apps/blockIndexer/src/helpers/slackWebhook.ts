import axios from "axios";

/**
 * Send an error to slack to notify team of issues with the block indexer
 * @param message A message to attach to the webhook
 * @param payload JSON payload to send as a slack message
 */
export const slackWebhook = async (message: string) => {
  const webhook = process.env.SLACK_WEBHOOK;
  if (!webhook) {
    console.error("Webhook URL not set");
    return;
  }
  try {
    await axios.post(
      webhook,
      {
        username: "Block Indexer Watcher",
        text: message,
        icon_url: "https://www.mevwatch.info/LabrysLogo.png"
      }
    );
  } catch (err: any) {
    console.error(err);
  }
};
