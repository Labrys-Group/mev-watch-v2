import { orderBy } from "lodash";
import { RelayStats } from "../types/relays";

/**
 * Split the relays up into OFAC and non-OFAC, this simplifies the presentation of the relayData
 */
export const sortAndDivideOfacRelays = (
  relayStats: RelayStats[]
): { isOfac: RelayStats[]; notOfac: RelayStats[] } => {
  const sortedRelayStats = orderBy(relayStats, ["numBlocks"], "desc");

  return sortedRelayStats.reduce<{
    isOfac: RelayStats[];
    notOfac: RelayStats[];
  }>(
    (allRelays, currentRelay) => {
      if (currentRelay.isOfacCensoring) {
        allRelays.isOfac.push(currentRelay);
      } else {
        allRelays.notOfac.push(currentRelay);
      }

      return allRelays;
    },
    { isOfac: [], notOfac: [] }
  );
};
