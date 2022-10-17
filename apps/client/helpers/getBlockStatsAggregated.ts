import { StatsAggregate, StatsAggregateModel } from "database";
import { AggregatedStats, RelayStats } from "../types";

/**
 * 12 hours periods since merge, with one block per 12 seconds
 */
const BLOCKS_PER_PERIOD = 12 * 60 * 5;

/**
 * Get MEV block stats for each relay to populate line chart
 *
 * @returns Stats for each relay in the required time period
 */
export const getBlockStatsAggregated = async (): Promise<AggregatedStats[]> => {
  const aggregatedStats = (await StatsAggregateModel.find().sort({
    ts: 1,
  })) as StatsAggregate[];

  const formattedStats: AggregatedStats[] = await Promise.all(
    aggregatedStats.map(async (periodAggregate) => {
      let censoringBlocks = 0;
      let nonCensoringBlocks = 0;

      const relayerStats: RelayStats[] = periodAggregate.stats.map(
        ({ relayerName, isOfacCensoring, blocks }) => {
          if (isOfacCensoring) {
            censoringBlocks += blocks;
          } else {
            nonCensoringBlocks += blocks;
          }

          return {
            name: relayerName,
            numBlocks: blocks,
            isOfacCensoring: isOfacCensoring,
          };
        }
      );

      return {
        date: periodAggregate.ts,
        relayerStats,
        totalBlocks: BLOCKS_PER_PERIOD,
        censoringBlocks,
        nonCensoringBlocks,
      };
    })
  );

  return formattedStats;
};
