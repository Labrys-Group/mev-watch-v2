import { BLOCK_NUMBER_OF_MERGE } from "consts";
import { connect } from "database";
import { ProviderSingleton } from "utils";

import { recursivelyPopulateBlockData } from "../helpers/recursivelyPopulateBlockStats";

const provider = ProviderSingleton.batchProvider;

const main = async (initialiseBlockNumber: number) => {
  await connect();

  const finalBlockNumber = await provider.getBlockNumber();

  await recursivelyPopulateBlockData(initialiseBlockNumber, finalBlockNumber);

  console.log("Done!");
};

main(15642476);
