import type { NextApiResponse } from "next";
import { z, ZodError } from "zod";
// TODO: Can this be fixed to not reference the dist folder
import { connect } from "database/dist";

import { TypedNextApiRequest } from "../../types/api";
import { RelayStats } from "../../types";
import { getTotalBlocks } from "../../helpers/getTotalBlocks";
import { getBlockStats } from "../../helpers/getBlockStats";

const blockStatsRequestSchema = z.object({
  // Using UNIX for requests to simplify datetime stuff
  startTime: z.number(),
  endTime: z.number(),
});

type GetBlockStatsRequest = z.infer<typeof blockStatsRequestSchema>;

export interface GetBlockStatsResponse {
  /**
   * Relay stats that occurred between startTime and endTime
   */
  relayStats: RelayStats[];
  /**
   * Number of blocks since provided startTime
   */
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

  const totalBlocks = await getTotalBlocks(startDate, endDate);

  const relayStats = await getBlockStats(startDate, endDate);

  if (!relayStats.length) {
    return res.status(200).send({ relayStats: [], totalBlocks: 0 });
  }

  res.status(200).send({ relayStats, totalBlocks });
};
