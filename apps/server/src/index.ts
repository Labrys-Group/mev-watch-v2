import { connect } from "database";
import { ProviderSingleton } from "utils";

import { RawBlock, Block } from "../types";

// Renamed the method for readability
const parseHexString = (value: string) => parseInt(value, 16);

const parseRawBlock = (rawBlock: RawBlock): Block => ({
  ...rawBlock,
  number: parseHexString(rawBlock.number),
  gasLimit: parseHexString(rawBlock.gasLimit),
  gasUsed: parseHexString(rawBlock.gasUsed),
  timestamp: parseHexString(rawBlock.timestamp),
});

connect();

// Directly using the subscribe method on the provider here as ethers provider.on("block") method actually deletes all of the block data apart from the number ...weird
// ProviderSingleton.websocketProvider._subscribe(
//   "block",
//   ["newHeads"],
//   (rawBlock: RawBlock) => {
//     const block = parseRawBlock(rawBlock);
//     console.log(block);
//   }
// );
