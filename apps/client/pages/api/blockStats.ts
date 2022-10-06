import type { NextApiResponse } from "next";
import { z, ZodError } from "zod";
// TODO: Can this be fixed to not reference the dist folder
import { connect } from "database/dist";
import { BlockStatsModel } from "database/dist/models";

import { TypedNextApiRequest } from "../../types/api";
import { RelayStats } from "../../types";
import { Relayer } from "database";
import { differenceInSeconds } from "date-fns";

const blockStatsRequestSchema = z.object({
  // Using UNIX for requests to simplify datetime stuff
  startTime: z.number(),
  endTime: z.number(),
});

type GetBlockStatsRequest = z.infer<typeof blockStatsRequestSchema>;

export interface GetBlockStatsResponse {
  relayStats: RelayStats[];
  // Number of blocks since provided startTime
  totalBlocks: number;
}

interface TimeFrameAggregationResponse {
  blocks: number;
  relayerData: Relayer;
}

export default async (
  req: TypedNextApiRequest<never, GetBlockStatsRequest>,
  res: NextApiResponse<GetBlockStatsResponse>
) => {
  await connect();

  try {
    blockStatsRequestSchema.parse(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      // Casting this return response to any because the type is enforcing a valid return type whereas we want to send an error
      return res.status(400).send(e.errors as any);
    }

    return res.status(400).end("Unknown Validation error");
  }

  const startDate = new Date(req.body.startTime * 1000);
  const endDate = new Date(req.body.endTime * 1000);

  const totalBlocks = differenceInSeconds(endDate, startDate) / 12;

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

  if (!blockStats.length) {
    return res.status(200).send({ relayStats: [], totalBlocks: 0 });
  }

  const relayStats: RelayStats[] = blockStats.map((_stats) => ({
    name: _stats.relayerData.name,
    numBlocks: _stats.blocks,
    isOfacCensoring: _stats.relayerData.isOfacCensoring,
  }));

  res.status(200).send({ relayStats, totalBlocks });
};
