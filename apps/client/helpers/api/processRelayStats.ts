import { Relayer, BlockStats } from "database";
import { Dictionary, keyBy, groupBy, forEach, sumBy, map } from "lodash";
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

  forEach(groupedStats, (allRelayBlocks, relayAddress) => {
    const foundRelayer: ExpandedRelayer | undefined =
      relayerMapping[relayAddress.toLowerCase()];

    if (foundRelayer) {
      relayStats.push({
        name: foundRelayer.name,
        numBlocks: allRelayBlocks.length,
        address: relayAddress,
        isOfacCensoring: foundRelayer.isOfacCensoring,
      });
    }
  });

  const groupedRelayStatsByName = groupBy(relayStats, (relay) => relay.name);

  return map(groupedRelayStatsByName, (relayStats, relayName): RelayStats => {
    const firstRelayStats = relayStats[0];

    return {
      address: firstRelayStats.address,
      name: relayName,
      isOfacCensoring: firstRelayStats.isOfacCensoring,
      numBlocks: sumBy(relayStats, (stats) => stats.numBlocks),
    };
  });
};
