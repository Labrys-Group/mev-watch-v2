import { Chart } from "chart.js";
import { sumBy } from "lodash";
import { colors } from "../styles/theme";
import { AggregatedStats, RelayStats } from "../types";
import getFormattedDatasets from "./getFormattedDatasets";
import getPercentage from "./getPercentage";
import { sortAndDivideOfacRelays } from "./relayProcessing";

export const getLineChartData = (
  relayStats: AggregatedStats[],
  isIncludingAllBlocks: boolean
) => {
  const ofacCompliantData = relayStats.map(
    ({ totalBlocks, censoringBlocks, nonCensoringBlocks }) =>
      censoringBlocks / totalBlocks
  );

  const nonOfacCompliantData = relayStats.map(
    ({ totalBlocks, censoringBlocks, nonCensoringBlocks }) =>
      nonCensoringBlocks / totalBlocks
  );

  const nonMevBlock = relayStats.map(
    ({ totalBlocks, censoringBlocks, nonCensoringBlocks }) =>
      (totalBlocks - censoringBlocks - nonCensoringBlocks) / totalBlocks
  );

  console.log({ ofacCompliantData, nonOfacCompliantData, nonMevBlock });

  const timeline = relayStats.map(({ date }) => date.toString());

  return {
    labels: timeline,
    datasets: [
      {
        label: "Not OFAC Compliant",
        data: nonOfacCompliantData,
        backgroundColor: colors.brightGreen[500],
        borderColor: colors.brightGreen[700],
        fill: true, 
      },
      {
        label: "OFAC Compliant",
        data: ofacCompliantData,
        backgroundColor: colors.brightRed[500],
        borderColor: colors.brightRed[700],
        fill: true
      },
    ],
  };
};
