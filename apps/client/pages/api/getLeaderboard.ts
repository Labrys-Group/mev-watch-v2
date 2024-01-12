import type { NextApiResponse } from "next";
import { TypedNextApiRequest, ILeaderboardEntity } from "../../types";
import { z } from "zod";
import axios from "axios";
import {
  getLeaderboardEntity,
  RatedNetworkEntity,
} from "../../helpers/getLeaderboardEntity";
import { timeFrames } from "consts";
import { getTotalBlocks } from "../../helpers/getTotalBlocks";
import { apiHandler } from "../../helpers/api-handler";
import { cache } from "../../helpers/apiHelpers/cache";

const RATED_OPERATOR_API = "https://api.rated.network/v0/eth/operators";

const getLeaderboardRequestSchema = z.object({
  timeFrame: z.string(),
  limit: z.number(),
});

type GetLeaderboardRequestSchema = z.infer<typeof getLeaderboardRequestSchema>;

export interface GetLeaderboardResponse {
  leaderboard: ILeaderboardEntity[];
}

const CACHE_TIME = 60 * 60 * 6; // 6 hour

export default apiHandler()
  .use(cache(CACHE_TIME))
  .get(
    async (
      req: TypedNextApiRequest<never, GetLeaderboardRequestSchema>,
      res: NextApiResponse<GetLeaderboardResponse>
    ) => {
      const { limit, timeFrame } = req.query as GetLeaderboardRequestSchema;

      const { RATED_NETWORK_API_TOKEN } = process.env;

      if (!RATED_NETWORK_API_TOKEN) {
        throw Error("RATED_NETWORK_API_TOKEN not set in env");
      }

      const ratedNetworkData = await axios.get(RATED_OPERATOR_API, {
        params: {
          from: 0,
          size: limit,
          window: timeFrame.toLowerCase(),
          idType: "entity",
        },
        headers: { Authorization: `Bearer ${RATED_NETWORK_API_TOKEN}` },
      });

      const entityData: RatedNetworkEntity[] = ratedNetworkData.data.data;

      const totalBlocksInPeriod = getTotalBlocks(
        new Date(timeFrames.find((t) => t.label === timeFrame)?.value! * 1000),
        new Date()
      );

      const leaderboard: ILeaderboardEntity[] = entityData.map((entity) =>
        getLeaderboardEntity(entity, totalBlocksInPeriod)
      );

      // sort by number of censored blocks rather than network penetration
      leaderboard.sort((a, b) => b.censoredBlocks - a.censoredBlocks);

      res.status(200).json({ leaderboard });
    }
  );
