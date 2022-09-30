import { BlockStats } from "database";

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

export interface ProcessedBlock extends BlockStats {
  hash: string;
  parentHash: string;
  gasLimit: number;
}
