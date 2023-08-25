// import { getDateFromSlotNumber } from "utils";

import { SLOT_NUMBER_OF_MERGE, DATE_OF_MERGE } from "consts";
import { Relayer, BlockStats } from "database";
import { addSeconds } from "date-fns";

interface RawRelayerResponse {
  slot: string;
  builder_pubkey: string;
  proposer_pubkey: string;
  proposer_fee_recipient: string;
  gas_used: string;
  value: string;
}

export const getDateFromSlotNumber = (slotNumber: number) => {
  // Block time is always 12 seconds, we can safely use this
  const totalSecondsElapsed = (slotNumber - SLOT_NUMBER_OF_MERGE) * 12;

  return addSeconds(DATE_OF_MERGE, totalSecondsElapsed);
};

export const parseRawRelayerResponse = (
  relayResponse: RawRelayerResponse,
  relayer: Relayer
): BlockStats => {
  const slotNumber = parseInt(relayResponse.slot, 10);
  return {
    builderPublicKey: relayResponse.builder_pubkey,
    feeRecipient: relayResponse.proposer_fee_recipient,
    gasUsed: parseInt(relayResponse.gas_used, 10),
    proposerPublicKey: relayResponse.proposer_pubkey,
    relayer,
    slotNumber,
    ts: getDateFromSlotNumber(slotNumber),
    value: relayResponse.value,
  };
};
