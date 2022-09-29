export interface RawBlock {
  number: string; // Hex string
  hash: string;
  parentHash: string;
  miner: string;
  gasLimit: string; // Hex string
  gasUsed: string; // Hex string
  timestamp: string; // Hex string
  baseFeePerGas: string; // Hex string
}

export interface Block {
  number: number;
  hash: string;
  parentHash: string;
  miner: string;
  gasLimit: number;
  gasUsed: number;
  timestamp: number;
  baseFeePerGas: string;
}
