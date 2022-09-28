import { greenGradient, redGradient } from "../styles/chartColor";
import { DatasetEntry, RelayStats } from "../types/relays";

const getFormattedDatasets = (
  relaysStats: RelayStats[],
  isOfacCompliant: boolean,
  totalBlocks: number,
  combineRelays: boolean
): DatasetEntry[] =>
  relaysStats.map((relay, index) => {
    const percentageOfBlocks = (relay.numBlocks / totalBlocks) * 100;
    const colorGradient = !isOfacCompliant ? greenGradient : redGradient;
    const backgroundColor = combineRelays
      ? colorGradient[0]
      : colorGradient[index];

    return {
      label: relay.name,
      backgroundColor,
      data: [percentageOfBlocks],
    };
  });

export default getFormattedDatasets;
