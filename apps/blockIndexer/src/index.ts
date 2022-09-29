import { BLOCK_NUMBER_OF_MERGE } from "consts";
import { connect, BlockStatsModel } from "database";
import { ProviderSingleton } from "utils";

import { RawBlock, ProcessedBlock } from "../types";

import { recursivelyPopulateBlockData } from "./helpers/recursivelyPopulateBlockStats";

// Renamed the method for readability
export const parseHexString = (value: string) => parseInt(value, 16);

export const parseRawBlock = (rawBlock: RawBlock): ProcessedBlock => ({
  hash: rawBlock.hash,
  relayAddress: rawBlock.miner,
  parentHash: rawBlock.parentHash,
  gasUsed: parseHexString(rawBlock.gasUsed),
  gasLimit: parseHexString(rawBlock.gasLimit),
  blockNumber: parseHexString(rawBlock.number),
  ts: new Date(parseHexString(rawBlock.timestamp) * 1000),
});

const main = async () => {
  await connect();

  // Use batch provider here because the recursive function will use the same provider saving memory
  const currentBlockNumber =
    await ProviderSingleton.batchProvider.getBlockNumber();

  const [lastBlockStatsInserted] = await BlockStatsModel.find()
    .sort({
      blockNumber: -1,
    })
    .limit(1);

  console.log(lastBlockStatsInserted);

  await recursivelyPopulateBlockData(
    lastBlockStatsInserted?.blockNumber ?? BLOCK_NUMBER_OF_MERGE,
    currentBlockNumber
  );

  // // Directly using the subscribe method on the provider here as ethers provider.on("block") method actually deletes all of the block data apart from the number ...weird
  // ProviderSingleton.websocketProvider._subscribe(
  //   "block",
  //   ["newHeads"],
  //   async (rawBlock: RawBlock) => {
  //     const block = parseRawBlock(rawBlock);

  //     await BlockStatsModel.create(block);
  //   }
  // );
};

main();
