import { BlockStats, Relayer } from "database";

import { getBlockStatsFromRelayer } from "./getBlockStatsFromRelayer";

interface GetLatestBlockStats {
  relayers: Relayer[];
}

/**
 * This method gets the latest block stats for the supplied relayers and returns the data. It also returns an array of any failed requests to relayers that might've occurred
 * @param param0 All the relayers to get block stats for
 * @returns Returns the blocks stats and an array of an relayers that might've failed, incase this needs handling
 */
export const getLatestBlockStats = async ({
  relayers,
}: GetLatestBlockStats): Promise<{
  blockStats: BlockStats[];
  failedRelayers: Relayer[];
}> => {
  const failedRelayers: Relayer[] = [];

  const results = await Promise.allSettled(
    relayers.map(async (relayer) => {
      try {
        return await getBlockStatsFromRelayer(relayer);
      } catch (e) {
        console.error(
          `Relayer failed to get data for ${JSON.stringify(relayer, null, 2)}`
        );
        failedRelayers.push(relayer);

        throw e;
      }
    })
  );

  const blockStats: BlockStats[] = [];

  results.forEach((item) => {
    if (item.status === "rejected") return;

    blockStats.push(...item.value);
  });

  return { blockStats, failedRelayers };
};
