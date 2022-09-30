import { greenGradient, redGradient } from "../styles/chartColor";
import { DatasetEntry, WebScrapedRelayStats } from "../types/relays";

const getFormattedDatasets = (
  relaysStats: WebScrapedRelayStats[],
  isOfacCompliant: boolean,
  totalBlocks: number,
  combineRelays: boolean
): DatasetEntry[] =>
  relaysStats.map((relay, index) => {
    const percentageOfBlocks = relay.numBlocks / totalBlocks;
    console.log("THIS", percentageOfBlocks);
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
