import { BlockStats, BlockStatsModel } from "database/dist";

/**
 * This method wraps the mongoDb insert call to allow for saving duplicates and then basic error handling
 * @param blockStats The blockStats to save
 */
export const saveBlockStats = async (blockStats: BlockStats[]) => {
  try {
    const response = await BlockStatsModel.insertMany(blockStats, {
      // Skip duplicates and still save everything else
      ordered: false,
    });

    // if we inserted without duplicates
    console.log(`Successfully inserted: ${response.length}`);
  } catch (e: any) {
    if (e.result.result.ok === 1) {
      console.log(`Successfully inserted: ${e.insertedCount}`);

      return;
    }

    console.error("Unknown mongodb write error");
    throw e;
  }
};
