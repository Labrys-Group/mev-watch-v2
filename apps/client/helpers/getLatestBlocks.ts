import { BlockStats, BlockStatsModel } from "database";

export const getLatestBlocks = async (limit: number): Promise<any[]> => {
  const latestBlocks = (await BlockStatsModel.aggregate([
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
  ])) as any[];

  return latestBlocks;
};
