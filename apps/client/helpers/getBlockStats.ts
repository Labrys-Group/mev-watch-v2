import { Relayer } from "database";
import { BlockStatsModel } from "database/src/models";
import { RelayStats } from "../types";

interface TimeFrameAggregationResponse {
  blocks: number;
  relayerData: Relayer;
}

/**
 * Get MEV block stats for each relay between start and end date
 *
 * @param startDate The date to check from
 * @param endDate The date to check up to
 * @returns Stats for each relay in the given time period
 */
export const getBlockStats = async (
  startDate: Date,
  endDate: Date
): Promise<RelayStats[]> => {
  const blockStats = (await BlockStatsModel.aggregate([
    { $match: { ts: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$relayer", blocks: { $count: {} } } },
    {
      $lookup: {
        from: "relayers",
        localField: "_id",
        foreignField: "_id",
        as: "relayerData",
      },
    },
    { $unwind: { path: "$relayerData" } },
  ])) as TimeFrameAggregationResponse[];

  const relayStats: RelayStats[] = blockStats.map((_stats) => ({
    name: _stats.relayerData.name,
    numBlocks: _stats.blocks,
    isOfacCensoring: _stats.relayerData.isOfacCensoring,
  }));

  return relayStats;
};
