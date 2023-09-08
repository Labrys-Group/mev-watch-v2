import { ActionFn, Context, BlockEvent, Event } from "@tenderly/actions";
import axios, { AxiosError } from "axios";

/**
 * Hit the mev-watch API once per block to trigger indexing of beacon chain data
 */
export const blockIndexerActionDev: ActionFn = async (
  context: Context,
  event: Event
) => {
  const blockEvent = event as BlockEvent;

  const mevApiSecret = await context.secrets.get("MEV_API_SECRET_DEV");
  const mevApiUrl = await context.secrets.get("MEV_API_URL_DEV");

  // TODO: Refactor to pass in secret key and api url as parameters
  try {
    const mevWatchApi = axios.create({
      baseURL: mevApiUrl,
      headers: { Authorization: `Bearer ${mevApiSecret}` },
    });

    const parameters = {
      blockNumber: blockEvent.blockNumber,
    };

    await mevWatchApi.post("/block-indexer", parameters);
  } catch (error) {
    console.error((error as AxiosError).response?.data);
  }
};
