import type { NextApiResponse } from "next";
import { connect } from "database/dist";
import { TypedNextApiRequest } from "../../types/api";
import { AggregatedStats } from "../../types";
import { getBlockStatsAggregated } from "../../helpers/getBlockStatsAggregated";
import { apiHandler } from "../../helpers/api-handler";
import { cache } from "../../helpers/apiHelpers/cache";

export interface AggregatedStatsResponse {
  /**
   * Relay stats that occurred between startTime and endTime
   */
  relayStats: AggregatedStats[];
}

const CACHE_TIME = 5 * 60; // 5 minutes

export default apiHandler()
  .use(cache(CACHE_TIME))
  .get(
    async (
      req: TypedNextApiRequest<never>,
      res: NextApiResponse<AggregatedStatsResponse>
    ) => {
      await connect();

      const relayStats = await getBlockStatsAggregated();

      if (!relayStats.length) {
        return res.status(200).send({ relayStats: [] });
      }

      res.status(200).send({ relayStats });
    }
  );
