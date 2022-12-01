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
    const gradient = (index * 100 + 100) as ColorGradient;

    const backgroundColor = isOfacCompliant
      ? colors.redBarGradient[gradient]
      : colors.greenBarGradient[gradient];

    return {
      label: relay.name,
      backgroundColor,
      data: [percentageOfBlocks],
    };
  });

export default getFormattedDatasets;
