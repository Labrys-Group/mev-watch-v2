import { connect, RelayerModel } from "database/dist";

import { setupAggregateJob } from "./helpers/aggregation/setupAggregateJob";
import { getLatestBlockStats } from "./helpers/getLatestBlockStats";
import { saveBlockStats } from "./helpers/saveBlockStats";
import { slackWebhook } from "./helpers/slackWebhook";

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

const main = async () => {
  await slackWebhook("Block Indexer Restarted");
  await connect();
  setupAggregateJob();
  await getLatestData();

  setInterval(() => getLatestData(), 12000);
};

main();
