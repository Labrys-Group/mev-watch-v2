import { BlockStatsModel, connect, Relayer, RelayerModel } from "database/dist";
import { minBy, groupBy, forEach } from "lodash";

import { delayMillis } from "../helpers/delayMillis";
import { getBlockStatsFromRelayer } from "../helpers/getBlockStatsFromRelayer";
import { saveBlockStats } from "../helpers/saveBlockStats";

const analyzeDB = async () => {
  const allBlockStats = await BlockStatsModel.find().populate("relayer");

  const groupedStats = groupBy(
    allBlockStats,
    (stats) => (stats.relayer as any).name
  );

  forEach(groupedStats, (stats, key) => {
    console.log(`${key} has ${stats.length} entries`);
  });
};

const recursivelyPopulateRelayerData = async (
  relayer: Relayer,
  fromSlotNumber: number
) => {
  try {
    console.log(
      `Getting relayer data for ${relayer.name} from slot ${fromSlotNumber}`
    );
    const relayerBlockStats = await getBlockStatsFromRelayer(
      relayer,
      fromSlotNumber
    );

    await saveBlockStats(relayerBlockStats);

    const nextFromSlotNumber = minBy(
      relayerBlockStats,
      (newBlockStats) => newBlockStats.slotNumber
    );

    if (!nextFromSlotNumber) {
      console.log(`Finished data population for ${relayer.name}`);

      return;
    }

    await delayMillis(5000);

    await recursivelyPopulateRelayerData(
      relayer,
      nextFromSlotNumber.slotNumber - 1
    );
  } catch (e) {
    console.log(e);
    console.error(`Relayer failed (stopping population): ${relayer.name}`);
  }
};

const main = async () => {
  await connect();

  const relayers = await RelayerModel.find();

  // const relayersWithoutFlashbots = relayers.filter(
  //   (relayer) => relayer.name !== "Flashbots"
  // );

  // const bloxRouteEthical = relayers.find(
  //   (relayer) => relayer.name === "Eden Network"
  // ) as Relayer;

  // await analyzeDB();

  // const blocks = await BlockStatsModel.find({
  //   relayer: bloxRouteEthical,
  // }).limit(0);

  // await recursivelyPopulateRelayerData(bloxRouteEthical, 0);

  await Promise.all(
    // Get all relayer data from inception
    relayers.map((relayer) => recursivelyPopulateRelayerData(relayer, 0))
  );
};

main();
