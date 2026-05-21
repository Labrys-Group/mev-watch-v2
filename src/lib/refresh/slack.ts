/**
 * Posts a message to the Slack incoming webhook in SLACK_WEBHOOK_URL, if set.
 * A no-op when unconfigured. Never throws — alerting must not break the caller.
 */
export async function sendSlackAlert(message: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[MEV Watch] ${message}` }),
    });
  } catch {
    // Swallow — a failed alert must never disrupt the refresh pipeline.
  }
}
