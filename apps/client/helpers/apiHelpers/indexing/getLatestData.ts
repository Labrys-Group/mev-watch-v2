import { RelayerModel } from "database";

import { getLatestBlockStats } from "./getLatestBlockStats";
import { saveBlockStats } from "./saveBlockStats";
import { slackWebhook } from "./slackWebhook";

/**
 * Retrieves the latest relayer data and saves the latest block stats to the database.
 * @async
 * @function
 * @returns {Promise<void>}
 */
export const getLatestData = async () => {
  try {
    const relayers = await RelayerModel.find({
      $or: [{ disabled: { $exists: false } }, { disabled: false }],
    }).sort({ priority: -1 });

    console.log({
      relayers: relayers.map((r) => r.name),
    });

    const latestBlockStats = await getLatestBlockStats({ relayers });

    await saveBlockStats(latestBlockStats.blockStats);

    return latestBlockStats;
  } catch (error: any) {
    console.error(error);
    await slackWebhook(`Failed to fetch latest relayer data: ${error.message}`);
  }
};
