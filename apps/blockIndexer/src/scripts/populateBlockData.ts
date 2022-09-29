import { connect } from "database";
import { ProviderSingleton } from "utils";

import { recursivelyPopulateBlockData } from "../helpers/recursivelyPopulateBlockStats";

const provider = ProviderSingleton.batchProvider;

const main = async (initialiseBlockNumber: number) => {
  await connect();

  const finalBlockNumber = await provider.getBlockNumber();

  await recursivelyPopulateBlockData(initialiseBlockNumber, finalBlockNumber);
};

main(15638929);
