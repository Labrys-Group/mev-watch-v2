import { connect, RelayerModel } from "database/dist";

import { setupAggregateJob } from "./helpers/aggregation/setupAggregateJob";
import { getLatestBlockStats } from "./helpers/getLatestBlockStats";
import { saveBlockStats } from "./helpers/saveBlockStats";

const getLatestData = async () => {
  console.log("Getting latest relayer data");

  const relayers = await RelayerModel.find();

  const latestBlockStats = await getLatestBlockStats({ relayers });

  await saveBlockStats(latestBlockStats.blockStats);
};

const main = async () => {
  await connect();
  setupAggregateJob();
  await getLatestData();

  setInterval(() => getLatestData(), 12000);
};

main();
