import { RelayStats } from "../types/relays";

const getPercentage = (relays: RelayStats[], totalBlocks: number) => {
  let blocks = 0;

  relays.forEach((relay) => (blocks += relay.numBlocks));

  return (blocks / totalBlocks) * 100;
};

export default getPercentage;
