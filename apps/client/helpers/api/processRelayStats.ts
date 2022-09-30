import { Relayer, BlockStats } from "database";
import { Dictionary, keyBy, groupBy, forEach, sumBy } from "lodash";
import { RelayStats } from "../../types/relays";

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

  return keyBy(expandedRelayers, (relayer) => relayer.address.toLowerCase());
};

export const processRelayStats = (
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
      relayerMapping[relayAddress.toLowerCase()];

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
