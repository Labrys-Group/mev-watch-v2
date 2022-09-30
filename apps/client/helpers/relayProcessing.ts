import { orderBy } from "lodash";
import { WebScrapedRelayStats } from "../types/relays";

/**
 * Split the relays up into OFAC and non-OFAC, this simplifies the presentation of the relayData
 */
export const sortAndDivideOfacRelays = (
  relayStats: WebScrapedRelayStats[]
): { isOfac: WebScrapedRelayStats[]; notOfac: WebScrapedRelayStats[] } => {
  const sortedRelayStats = orderBy(relayStats, ["numBlocks"], "desc");

  return sortedRelayStats.reduce<{
    isOfac: WebScrapedRelayStats[];
    notOfac: WebScrapedRelayStats[];
  }>(
    (allRelays, currentRelay) => {
      if (currentRelay.ofacCompliant) {
        allRelays.isOfac.push(currentRelay);
      } else {
        allRelays.notOfac.push(currentRelay);
      }

      return allRelays;
    },
    { isOfac: [], notOfac: [] }
  );
};
