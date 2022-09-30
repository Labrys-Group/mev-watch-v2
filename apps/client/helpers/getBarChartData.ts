import { sumBy } from "lodash";
import { colors } from "../styles/theme";
import { RelayStats } from "../types";
import getFormattedDatasets from "./getFormattedDatasets";
import getPercentage from "./getPercentage";
import { sortAndDivideOfacRelays } from "./relayProcessing";

export const getBarChartData = (
  relayStats: RelayStats[],
  totalBlocks: number,
  isIncludingAllBlocks: boolean
) => {
  const totalBlocksFromRelays = sumBy(relayStats, (stats) => stats.numBlocks);

  const overallBlocks = isIncludingAllBlocks
    ? totalBlocks
    : totalBlocksFromRelays;

  const { isOfac, notOfac } = sortAndDivideOfacRelays(relayStats);

  return {
    labels: [""],
    datasets: isIncludingAllBlocks
      ? [
          {
            label: "OFAC Compliant",
            backgroundColor: colors.brightRed[500],
            data: [sumBy(isOfac, (o) => o.numBlocks) / overallBlocks],
          },
          {
            label: "Not OFAC Compliant",
            backgroundColor: colors.brightGreen[500],
            data: [sumBy(notOfac, (o) => o.numBlocks) / overallBlocks],
          },
          {
            label: "Non-MEV-Boost",
            backgroundColor: "#CBCBCB",
            data: [1 - getPercentage([...isOfac, ...notOfac], overallBlocks)],
          },
        ]
      : [
          // Display all the OFAC compliant relays first and then the non-OFAC relays
          ...getFormattedDatasets(isOfac, true, overallBlocks),
          ...getFormattedDatasets(notOfac, false, overallBlocks),
        ],
  };
};
