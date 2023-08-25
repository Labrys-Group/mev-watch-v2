import { StatsAggregate, StatsAggregateModel } from "database";

/**
 * This method wraps the mongoDb insert call to allow for saving duplicates and then basic error handling
 * @param stats The aggregated stats data to save
 */
export const saveAggregateStats = async (stats: StatsAggregate[]) => {
  try {
    const response = await StatsAggregateModel.insertMany(stats, {
      ordered: false,
    });

    console.log(`Successfully inserted aggregate: ${response.length}`);
  } catch (e: any) {
    if (e.result.result.ok === 1) {
      console.log(`Successfully inserted aggregate: ${e.insertedCount}`);

      return;
    }

    console.error("Unknown mongodb write error on aggregate");
    throw e;
  }
};
