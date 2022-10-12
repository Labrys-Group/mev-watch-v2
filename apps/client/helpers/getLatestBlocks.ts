import { BlockStatsModel } from "database/dist/models";
import { VisualizationBlock } from "../types";

export const getLatestBlocks = async (
  limit: number
): Promise<VisualizationBlock[]> => {
  const latestBlocks: VisualizationBlock[] = await BlockStatsModel.aggregate([
    {
      $sort: {
        ts: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "relayers",
        localField: "relayer",
        foreignField: "_id",
        as: "relayer",
      },
    },
    {
      $unwind: {
        path: "$relayer",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  return latestBlocks;
};
