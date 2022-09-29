import type { NextApiResponse } from "next";
import { z } from "zod";
import { BlockStatsModel, RelayerModel } from "database";

import { TypedNextApiRequest } from "../../types/api";
import { groupBy } from "lodash";

const blockStatsRequestSchema = z.object({
  // Using UNIX for requests to simplify datetime stuff
  startTime: z.number(),
  endTime: z.number(),
});

type BlockStatsRequest = z.infer<typeof blockStatsRequestSchema>;

interface Response {
  name: string;
}

export const getBlockStats = async (
  req: TypedNextApiRequest<BlockStatsRequest>,
  res: NextApiResponse<Response>
) => {
  // TODO: These timezones need checking
  const startDate = new Date(req.body.startTime * 1000);
  const endDate = new Date(req.body.endTime * 1000);

  // TODO: Can this be cast to just an object?
  const blockStats = await BlockStatsModel.find({
    ts: { $gte: startDate, $lte: endDate },
  });

  const relayers = await RelayerModel.find();

  const groupedStats = groupBy(
    blockStats,
    (blockStat) => blockStat.relayAddress
  );

  res.status(200).json({ name: "John Doe" });
};
