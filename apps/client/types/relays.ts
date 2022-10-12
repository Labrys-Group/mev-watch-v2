export interface RelayStats {
  name: string;
  numBlocks: number;
  isOfacCensoring: boolean;
}

export interface AggregatedStats {
  date: Date;
  relayerStats: RelayStats[];
  totalBlocks: number;
  censoringBlocks: number;
  nonCensoringBlocks: number;
}

export interface WebScrapedRelayStats extends RelayStats {
  avgBlockValue: number;
  totalValueETH: number;
}

export type GenericResponse<T> =
  | { success: false; error: any }
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
