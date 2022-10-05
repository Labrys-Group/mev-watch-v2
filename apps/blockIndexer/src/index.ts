import { BlockStatsModel, connect, RelayerModel } from "database";

import { getLatestBlockStats } from "./helpers/getLatestBlockStats";

const getLatestData = async () => {
  console.log("Getting latest relayer data");

  const relayers = await RelayerModel.find();

  const latestBlockStats = await getLatestBlockStats({ relayers });

  try {
    await BlockStatsModel.insertMany(latestBlockStats.blockStats, {
      // Skip duplicates and still save everything else
      ordered: false,
    });
  } catch (e: any) {
    if (e.result.result.ok === 1) {
      console.log(`Successfully inserted: ${e.insertedCount}`);

      return;
    }

    console.error("Unknown mongodb write error");
    throw e;
  }
};

const main = async () => {
  await connect();

  setInterval(() => getLatestData(), 10000);
};

main();
