import type { NextApiResponse } from "next";
import { z } from "zod";
import {
  BlockStats,
  BlockStatsModel,
  connect,
  Relayer,
  RelayerModel,
} from "database";

import { TypedNextApiRequest } from "../../types/api";
import { Dictionary, forEach, groupBy, keyBy, map, sumBy } from "lodash";
import { ProviderSingleton } from "utils";
import { BLOCK_NUMBER_OF_MERGE } from "consts";

const blockStatsRequestSchema = z.object({
  // Using UNIX for requests to simplify datetime stuff
  startTime: z.number(),
  endTime: z.number(),
});

type BlockStatsRequest = z.infer<typeof blockStatsRequestSchema>;

interface RelayStats {
  name: string;
  numBlocks: number;
  isOfacCensoring: boolean;
}

interface Response {
  relayStats: RelayStats[];
  // Number of blocks since provided startTime
  totalBlocks: number;
}

type ExpandedRelayer = Omit<Relayer, "addresses"> & { address: string };

/**
 * This method first removes the addresses array field and adds an address field to all relayer objects. This then allows us to produce a mapping of relayerAddress to relayer. This mapping can then be efficiently used when we try to find a relayer to relayAddress
 */
const getRelayerMapping = (
  relayers: Relayer[]
): Dictionary<ExpandedRelayer> => {
  const expandedRelayers: ExpandedRelayer[] = [];

  for (const relayer of relayers) {
    for (const address of relayer.addresses) {
      expandedRelayers.push({
        name: relayer.name,
        address,
        isOfacCensoring: relayer.isOfacCensoring,
      });
    }
  }

  return keyBy(expandedRelayers, (relayer) => relayer.address);
};

const getRelayStats = (
  blockStats: BlockStats[],
  relayers: Relayer[]
): RelayStats[] => {
  const relayerMapping = getRelayerMapping(relayers);

  const groupedStats = groupBy(
    blockStats,
    (blockStat) => blockStat.relayAddress
  );

  const relayStats: RelayStats[] = [];

  forEach(groupedStats, (allRelayStats, relayAddress) => {
    const totalNumBlocks = sumBy(
      allRelayStats,
      (relayStats) => relayStats.blockNumber
    );

    const foundRelayer: ExpandedRelayer | undefined =
      relayerMapping[relayAddress];

    if (!foundRelayer) {
      // TODO: How to handle
    } else {
      relayStats.push({
        name: foundRelayer.name,
        numBlocks: totalNumBlocks,
        isOfacCensoring: foundRelayer.isOfacCensoring,
      });
    }
  });

  // TODO: We need to aggregate the relayers with names again, we will have duplicate name entries

  return relayStats;
};

export const getBlockStats = async (
  req: TypedNextApiRequest<BlockStatsRequest>,
  res: NextApiResponse<Response>
) => {
  await connect();

  // TODO: These timezones need checking
  const startDate = new Date(req.body.startTime * 1000);
  const endDate = new Date(req.body.endTime * 1000);

  const currentBlockNumber = await ProviderSingleton.provider.getBlockNumber();

  // TODO: Can this be cast to just an object?
  const blockStats = await BlockStatsModel.find({
    ts: { $gte: startDate, $lte: endDate },
  });

  const relayers = await RelayerModel.find();

  const relayStats = getRelayStats(blockStats, relayers);

  // TODO: This is wrong it needs to be number of blocks from start to end
  const totalBlocks = currentBlockNumber - BLOCK_NUMBER_OF_MERGE;

  res.status(200).json({ relayStats, totalBlocks });
};
