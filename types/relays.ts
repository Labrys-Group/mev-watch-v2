export interface RelayStats {
  name: string;
  numBlocks: number;
  totalValueETH: number;
  avgBlockValue: number;
  ofacCompliant: boolean;
}

export type GenericResponse<T> =
  | { success: false }
  | { success: true; response: T };

export type RelayerResponseData = GenericResponse<{
  relayStats: RelayStats[];
  numBlocksSinceMerge: number;
}>;
