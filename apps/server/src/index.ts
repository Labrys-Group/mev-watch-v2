import { connect, BlockStatsModel } from "database";
import { ProviderSingleton } from "utils";

import { RawBlock, Block } from "../types";

// Renamed the method for readability
const parseHexString = (value: string) => parseInt(value, 16);

const parseRawBlock = (rawBlock: RawBlock): Block => ({
  hash: rawBlock.hash,
  // Remapping this name to something more familiar
  relayAddress: rawBlock.miner,
  parentHash: rawBlock.parentHash,
  baseFeePerGas: rawBlock.baseFeePerGas,
  gasUsed: parseHexString(rawBlock.gasUsed),
  gasLimit: parseHexString(rawBlock.gasLimit),
  blockNumber: parseHexString(rawBlock.number),
  timestamp: parseHexString(rawBlock.timestamp),
});

const main = async () => {
  await connect();
  // Directly using the subscribe method on the provider here as ethers provider.on("block") method actually deletes all of the block data apart from the number ...weird
  ProviderSingleton.websocketProvider._subscribe(
    "block",
    ["newHeads"],
    async (rawBlock: RawBlock) => {
      const block = parseRawBlock(rawBlock);

      await BlockStatsModel.create(block);
    }
  );
};

main();
