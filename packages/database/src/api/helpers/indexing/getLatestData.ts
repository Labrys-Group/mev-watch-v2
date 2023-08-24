import { RelayerModel } from "../../../../dist";

import { getLatestBlockStats } from "./getLatestBlockStats";
import { saveBlockStats } from "./saveBlockStats";
import { slackWebhook } from "./slackWebhook";

const getLatestData = async () => {
  try {
    console.log("Getting latest relayer data");

    const relayers = await RelayerModel.find().sort({ priority: -1 });

    const latestBlockStats = await getLatestBlockStats({ relayers });
    await saveBlockStats(latestBlockStats.blockStats);
  } catch (error: any) {
    console.error(error);
    await slackWebhook(`Failed to fetch latest relayer data: ${error.message}`);
  }
};
