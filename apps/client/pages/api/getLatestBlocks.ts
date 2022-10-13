import { connect } from "database/dist";
import type { NextApiResponse } from "next";
import { VisualizationBlock, TypedNextApiRequest } from "../../types";
import { z, ZodError } from "zod";
import { BlockStatsModel } from "database/src/models";

const getLatestBlocksRequestSchema = z.object({
  limit: z.number(),
});

type GetLatestBlocksRequest = z.infer<typeof getLatestBlocksRequestSchema>;

export interface GetLatestBlocksResponse {
  visualizationBlocks: VisualizationBlock[];
}

export default async (
  req: TypedNextApiRequest<never, GetLatestBlocksRequest>,
  res: NextApiResponse<GetLatestBlocksResponse>
) => {
  await connect();

  const { limit } = req.body;

  // Zod body validation
  try {
    getLatestBlocksRequestSchema.parse(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).send(e.errors as any);
    }
    return res.status(400).end("Unknown Validation error");
  }

  const visualizationBlocks = await BlockStatsModel.aggregate([
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

  res.status(200).send({ visualizationBlocks });
};
