import { DATE_OF_MERGE, timeFrames } from "consts";
import { ILeaderboardEntity } from "../types";
import { getTotalBlocks } from "./getTotalBlocks";

export interface RatedNetworkEntity {
  id: string;
  timeWindow: string;
  validatorCount: number;
  networkPenetration: number;
  clientPercentages: { client: string; percentage: number };
  relayerPercentages: { relayer: string; percentage: number }[];
}

/**
 * Relays that are censoring (as they are labelled by Rated.network)
 */
const censoringRelays = [
  "flashbots",
  "blocknative",
  "edennetwork",
  "bloxroute_regulated",
];

/**
 * Convert a rated.network entity into a leaderboard entity
 */
export const getLeaderboardEntity = (
  entity: RatedNetworkEntity,
  totalBlocksInPeriod: number
): ILeaderboardEntity => {
    if(entity.id ==="Lido") console.log(entity, {totalBlocksInPeriod})
  const totalBlocks = Math.floor(
    totalBlocksInPeriod * entity.networkPenetration
  );
  const censoredBlocks = Math.floor(
    totalBlocks *
      entity.relayerPercentages.reduce(
        (censoring, relayer) =>
          censoringRelays.includes(relayer.relayer)
            ? (censoring += relayer.percentage)
            : censoring,
        0
      )
  );

  return {
    entityName: entity.id,
    entityLogo: "",
    totalBlocks,
    censoredBlocks,
  };
};
