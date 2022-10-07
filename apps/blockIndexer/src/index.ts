import { connect, RelayerModel } from "database";

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

  setInterval(() => getLatestData(), 12000);

  // TODO: Calculate aggregates here, hourly, daily, etc

  await getLatestData();
};

main();
