import { colors } from "../styles/theme";
import { ColorGradient } from "../types";
import { DatasetEntry, RelayStats } from "../types/relays";

const getFormattedDatasets = (
  relaysStats: RelayStats[],
  isOfacCompliant: boolean,
  totalBlocks: number
): DatasetEntry[] =>
  relaysStats.map((relay, index) => {
    const percentageOfBlocks = relay.numBlocks / totalBlocks;
    const gradient = (index * 100 + 500) as ColorGradient;

    const backgroundColor = isOfacCompliant
      ? colors.red[gradient]
      : colors.brightGreen[gradient];

    return {
      label: relay.name,
      backgroundColor,
      data: [percentageOfBlocks],
    };
  });

export default getFormattedDatasets;
