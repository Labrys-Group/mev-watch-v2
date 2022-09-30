import type { NextApiResponse } from "next";
import { z, ZodError, ZodIssue } from "zod";
// TODO: Can this be fixed to not reference the dist folder
import { connect } from "database/dist";

import { TypedNextApiRequest } from "../../types/api";
import { ProviderSingleton } from "utils";
import { BLOCK_NUMBER_OF_MERGE } from "consts";
import { processRelayStats } from "../../helpers/api/processRelayStats";
import { RelayerResponseData } from "../../types/relays";

const blockStatsRequestSchema = z.object({
  // Using UNIX for requests to simplify datetime stuff
  startTime: z.number(),
  endTime: z.number(),
});

type GetBlockStatsRequest = z.infer<typeof blockStatsRequestSchema>;

interface RelayStats {
  name: string;
  numBlocks: number;
  isOfacCensoring: boolean;
}

export interface GetBlockStatsResponse {
  relayStats: RelayStats[];
  // Number of blocks since provided startTime
  totalBlocks: number;
}

export default async (
  req: TypedNextApiRequest<GetBlockStatsRequest>,
  res: NextApiResponse<GetBlockStatsResponse>
) => {
  // try {
  //   blockStatsRequestSchema.parse(req.body);
  // } catch (e) {
  //   if (e instanceof ZodError) {
  //     return res.status(200).send({ success: false, error: e.errors });
  //   }

  //   return res.status(400).send({ success: false, error: "Validation failed" });
  // }

  return res.status(200).json({ relayStats: [], totalBlocks: 0 });
  // await connect();

  // // // TODO: These timezones need checking
  // const startDate = new Date(req.body.startTime * 1000);
  // const endDate = new Date(req.body.endTime * 1000);

  // console.log(startDate);

  // const currentBlockNumber = await ProviderSingleton.provider.getBlockNumber();

  // // TODO: Can this be cast to just an object?
  // const blockStats = await BlockStatsModel.find({
  //   ts: { $gte: startDate, $lte: endDate },
  // });

  // const relayers = await RelayerModel.find();

  // const relayStats = processRelayStats(blockStats, relayers);

  // // TODO: This is wrong it needs to be number of blocks from start to end
  // const totalBlocks = currentBlockNumber - BLOCK_NUMBER_OF_MERGE;

  // res.status(200).json({ relayStats, totalBlocks });

  // res.status(200).json({ relayStats: [], totalBlocks: 0 });
};
