import axios from "axios";
import { Relayer } from "database";
import { RawRelayerResponse } from "../../../types/relayer";

import { parseRawRelayerResponse } from "./parseRelayResponse";

/**
 * This method returns all the blocks stats for a given relayer
 * @param relayer The relayer to get the data for
 * @param fromSlotNumber This selected from this slot number down for a maximum of 200 items. If 0 is provided it will get the latest entries
 * @returns The formatted block stats data
 */
export const getBlockStatsFromRelayer = async (
  relayer: Relayer,
  fromSlotNumber?: number
) => {
  const { data } = await axios.get<RawRelayerResponse[]>(
    "/relay/v1/data/bidtraces/proposer_payload_delivered",
    {
      // This selected from this slot number down for a maximum of 200 items. If 0 is provided it will get the latest entries
      params: { cursor: fromSlotNumber || 0, order_by: "-slot" },
      baseURL: relayer.url,
    }
  );

  return data.map((response) => parseRawRelayerResponse(response, relayer));
};
