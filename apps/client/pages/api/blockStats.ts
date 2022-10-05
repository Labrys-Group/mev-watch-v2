import type { NextApiResponse } from "next";
import { z, ZodError } from "zod";
// TODO: Can this be fixed to not reference the dist folder
import { BlockStatsModel, connect } from "database/dist";

import { TypedNextApiRequest } from "../../types/api";
import { RelayStats } from "../../types";

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

  // TODO: Can this be cast to just an object?
  const blockStats = await BlockStatsModel.find({
    ts: { $gte: startDate, $lte: endDate },
  }).sort({ ts: -1 });

  if (!blockStats.length) {
    return res.status(200).send({ relayStats: [], totalBlocks: 0 });
  }

  // TODO: Route logic
};
