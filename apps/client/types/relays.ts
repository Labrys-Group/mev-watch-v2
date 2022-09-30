interface RelayStats {
  name: string;
  numBlocks: number;
  totalValueETH: number;
}

export interface WebScrapedRelayStats extends RelayStats {
  avgBlockValue: number;
  ofacCompliant: boolean;
}

export type GenericResponse<T> =
  | { success: false }
  | { success: true; response: T };

export type RelayerResponseData = GenericResponse<{
  relayStats: WebScrapedRelayStats[];
  numBlocksSinceMerge: number;
}>;

export interface DatasetEntry {
  label: string;
  backgroundColor: string;
  data: number[];
}
