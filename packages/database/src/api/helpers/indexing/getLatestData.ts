import { RelayerModel } from "../../../../dist";

import { getLatestBlockStats } from "./getLatestBlockStats";
import { saveBlockStats } from "./saveBlockStats";
// import { slackWebhook } from "./slackWebhook";

/**
 * Retrieves the latest relayer data and saves the latest block stats to the database.
 * @async
 * @function
 * @returns {Promise<void>}
 */
export const getLatestData = async () => {
  // try {
  // console.log("Getting latest relayer data");

  const relayers = await RelayerModel.find().sort({ priority: -1 });

  const latestBlockStats = await getLatestBlockStats({ relayers });

  await saveBlockStats(latestBlockStats.blockStats);
  // } catch (error: any) {
  //   console.error(error);
  //   await slackWebhook(`Failed to fetch latest relayer data: ${error.message}`);
  // }
};
