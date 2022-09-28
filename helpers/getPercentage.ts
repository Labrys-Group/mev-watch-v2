import sumBy from "lodash/sumBy";
import { RelayStats } from "../types/relays";

const getPercentage = (relaysStats: RelayStats[], totalBlocks: number) => {
  const blocks = sumBy(relaysStats, (relay) => relay.numBlocks);

  return blocks / totalBlocks;
};

export default getPercentage;
