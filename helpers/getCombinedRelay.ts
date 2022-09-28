import { RelayStats } from "../types/relays";

const getCombinedRelay = (
  relaysStats: RelayStats[],
  name: string
): RelayStats => {
  let totalBlocks = 0;

  relaysStats.forEach((relay) => (totalBlocks += relay.numBlocks));

  return {
    name,
    numBlocks: totalBlocks,
  };
};

export default getCombinedRelay;
