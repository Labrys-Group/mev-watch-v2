import { BlockStats, Relayer } from "database";

interface RawRelayerResponse {
  slot: string;
  builder_pubkey: string;
  proposer_pubkey: string;
  proposer_fee_recipient: string;
  gas_used: string;
  value: string;
}

export const parseRawRelayerResponse = (
  relayResponse: RawRelayerResponse,
  relayer: Relayer
): BlockStats => ({
  builderPublicKey: relayResponse.builder_pubkey,
  feeRecipient: relayResponse.proposer_fee_recipient,
  gasUsed: parseInt(relayResponse.gas_used, 10),
  proposerPublicKey: relayResponse.proposer_pubkey,
  relayer,
  slotNumber: parseInt(relayResponse.slot, 10),
  // TODO: Populate:
  ts: new Date(),
  value: relayResponse.value,
});
