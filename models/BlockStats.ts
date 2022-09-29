// TODO:
// A new document for this will be created on each new block coming from ethers provider
export interface BlockStats {
  // This could alternatively be a ref to the Relayers model
  relayerAddress: string;
  blockNumber: number;
}
