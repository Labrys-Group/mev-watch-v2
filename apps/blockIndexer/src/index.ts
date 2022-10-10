import { connect, RelayerModel } from "database";

import { getAggregateStats } from "./helpers/aggregation/getAggregateStats";
import { saveAggregateStats } from "./helpers/aggregation/saveAggregateStats";
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
  await getLatestData();

  setInterval(() => getLatestData(), 12000);
};

main();
