import sumBy from "lodash/sumBy";
import { WebScrapedRelayStats } from "../types/relays";

const getPercentage = (
  relaysStats: WebScrapedRelayStats[],
  totalBlocks: number
) => {
  const blocks = sumBy(relaysStats, (relay) => relay.numBlocks);

  return blocks / totalBlocks;
};

export default getPercentage;
