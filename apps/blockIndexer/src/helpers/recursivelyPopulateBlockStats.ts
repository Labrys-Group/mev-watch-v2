import { Block } from "@ethersproject/abstract-provider";
import { BlockStatsModel, connect } from "database";
import { range } from "lodash";
import { ProviderSingleton } from "utils";

import { ProcessedBlock } from "../../types";

const provider = ProviderSingleton.batchProvider;

const MAX_BATCH_SIZE = 100;

const parseProviderBlock = (block: Block): ProcessedBlock => ({
  hash: block.hash,
  parentHash: block.parentHash,
  relayAddress: block.miner,
  ts: new Date(block.timestamp * 1000),
  blockNumber: block.number,
  gasLimit: block.gasLimit.toNumber(),
  gasUsed: block.gasUsed.toNumber(),
});

export const recursivelyPopulateBlockData = async (
  startBlock: number,
  finalBlockNumber: number
) => {
  let fromBlock = startBlock;

  const remainingTotalBlocks = finalBlockNumber - fromBlock;

  const currentBatchSize =
    remainingTotalBlocks < MAX_BATCH_SIZE
      ? remainingTotalBlocks
      : MAX_BATCH_SIZE;

  console.log(
    `From block: ${fromBlock}\nBatch size: ${currentBatchSize}\nRemaining Blocks: ${remainingTotalBlocks}\n`
  );

  const results = await Promise.all(
    range(currentBatchSize).map((idx) => provider.getBlock(idx + fromBlock))
  );
  const parsedBlocks: ProcessedBlock[] = results.map(parseProviderBlock);
  await BlockStatsModel.create(parsedBlocks);

  fromBlock += currentBatchSize;

  if (fromBlock === finalBlockNumber) {
    // Allow for the blocks that have come in since the script started running
    const currentBlockNumber = await provider.getBlockNumber();

    if (currentBlockNumber > fromBlock) {
      await recursivelyPopulateBlockData(fromBlock, currentBlockNumber);
      return;
    }

    return;
  }

  await recursivelyPopulateBlockData(fromBlock, finalBlockNumber);
};
