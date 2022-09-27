export interface RelayStats {
  name: string;
  numBlocks: number;
  totalValueETH: number;
  avgBlockValue: number;
  ofacCompliant: boolean;
}

export type RelayerResponseData =
  | { success: true; relayStats: RelayStats[] }
  | { success: false };
