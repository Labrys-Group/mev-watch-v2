import { StatsAggregate, BlockStatsModel } from "database";
import { add } from "date-fns";

/**
 * Time between data aggregations in hours
 */
export const AGGREGATION_PERIOD = 12;

/**
 * Get MEV block stats for each relay between start and end date
 *
 * @param startDate The date to check from
 * @param endDate The date to check up to
 * @returns Stats for each relay in the given time period
 */
export const getBlockStats = async (startDate: Date, endDate: Date) => {
  const blockStats = await BlockStatsModel.aggregate([
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
  ]);

  const relayStats = blockStats.map((_stats) => ({
    relayer: _stats.relayerData._id,
    relayerName: _stats.relayerData.name,
    isOfacCensoring: _stats.relayerData.isOfacCensoring,
    blocks: _stats.blocks,
  }));

  return relayStats;
};

/**
 * @param startDate: the date to start aggregation at, and will include the next 12 hours after this date
 * @returns Stats for the block date
 */
export const getAggregateStats = async (
  startDate: Date
): Promise<StatsAggregate> => {
  const endDate = add(startDate, { hours: AGGREGATION_PERIOD });

  const blockStats = await getBlockStats(startDate, endDate);

  return {
    stats: blockStats,
    startDate,
    ts: endDate,
    key: `${startDate.toISOString()}-${endDate.toISOString()}`,
  };
};
