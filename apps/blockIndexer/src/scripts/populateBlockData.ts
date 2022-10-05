import { BlockStatsModel, connect, Relayer, RelayerModel } from "database";
import { minBy } from "lodash";

import { getBlockStatsFromRelayer } from "../helpers/getBlockStatsFromRelayer";
import { saveBlockStats } from "../helpers/saveBlockStats";

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

    // Is it inclusive with the end of array? Add 1?
    // When we stop getting responses is it actually finished?

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

  const bloxRouteEthical = relayers.find(
    (relayer) => relayer.name === "BloXroute Ethical"
  ) as Relayer;

  // const blocks = await BlockStatsModel.find({
  //   relayer: bloxRouteEthical,
  // }).limit(0);

  await recursivelyPopulateRelayerData(bloxRouteEthical, 0);

  // await Promise.all(
  //   // Get all relayer data from inception
  //   relayers.map((relayer) => recursivelyPopulateRelayerData(relayer, 0))
  // );
};

main();
