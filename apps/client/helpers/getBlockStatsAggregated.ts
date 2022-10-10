import { BlockStatsModel, Relayer, RelayerModel, StatsAggregateModel } from "database/dist/models";
import { RelayStats } from "../types";

/**
 * Get MEV block stats for each relay in time frame
 *
 * @param timeFrame The time frame to fetch stats for as a string
 * @param startDate The date at which to start the time frame calculation
 * @returns Stats for each relay in the given time period
 */
export const getBlockStatsAggregated = async (
  timeFrame: string,
  startDate: Date
): Promise<RelayStats[]> => { 
  const blockStats = await StatsAggregateModel.findOne({}).sort({ ts: -1 });

  const relayers = await RelayerModel.find();

  const timeFrameStats = blockStats?.stats.find(
    ({ timeFrame: tf }) => tf === timeFrame
  );

  if (!timeFrameStats) {
    return [];
  }
  
  const relayStats: RelayStats[] = timeFrameStats.stats.map((_stats) => ({
    name: relayers.find(({ _id }) => _id === _stats.relayer)?.name ?? "Relayer",
    numBlocks: _stats.blocks,
    isOfacCensoring: _stats.isOfacCensoring,
  }));

  console.log({ blockStats, timeFrameStats, relayers, relayStats });

  return relayStats;
};
