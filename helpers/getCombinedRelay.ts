import sumBy from "lodash/sumBy";
import { RelayStats } from "../types/relays";

const getCombinedRelay = (
  relaysStats: RelayStats[],
  name: string
): RelayStats => {
  const totalBlocks = sumBy(relaysStats, (relay) => relay.numBlocks);

  return {
    name,
    numBlocks: totalBlocks,
  };
};

export default getCombinedRelay;
