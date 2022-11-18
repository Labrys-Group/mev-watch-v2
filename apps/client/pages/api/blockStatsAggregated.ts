import type { NextApiResponse } from "next";
import { z, ZodError } from "zod";
// TODO: Can this be fixed to not reference the dist folder
import { connect } from "database/dist";

import { TypedNextApiRequest } from "../../types/api";
import { AggregatedStats, RelayStats } from "../../types";
import { getBlockStatsAggregated } from "../../helpers/getBlockStatsAggregated";



export interface AggregatedStatsResponse {
  /**
   * Relay stats that occurred between startTime and endTime
   */
  relayStats: AggregatedStats[];
}

export default async (
  req: TypedNextApiRequest<never>,
  res: NextApiResponse<AggregatedStatsResponse>
) => {
  await connect();


  const relayStats = await getBlockStatsAggregated();

  if (!relayStats.length) {
    return res.status(200).send({ relayStats: [] });
  }

  res.status(200).send({ relayStats });
};
