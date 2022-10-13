import { colors } from "../styles/theme";
import { AggregatedStats } from "../types";

export const getLineChartData = (
  relayStats: AggregatedStats[],
  isIncludingAllBlocks: boolean
) => {
  const sumOfacCompliantData = relayStats.map(
    ({ totalBlocks, censoringBlocks, nonCensoringBlocks }) =>
      isIncludingAllBlocks
        ? censoringBlocks / totalBlocks
        : (1 - nonCensoringBlocks / (nonCensoringBlocks + censoringBlocks))
  );

  const sumNonOfacCompliantData = relayStats.map(
    ({ totalBlocks, nonCensoringBlocks, censoringBlocks }) =>
      isIncludingAllBlocks
        ? nonCensoringBlocks / totalBlocks
        : nonCensoringBlocks / (nonCensoringBlocks + censoringBlocks)
  );

  const nonMevBoostData = relayStats.map(
    ({ totalBlocks, censoringBlocks, nonCensoringBlocks }) =>
      (totalBlocks - censoringBlocks - nonCensoringBlocks) / totalBlocks
  );

  const timeline = relayStats.map(({ date }) =>
    new Date(date).toDateString().slice(4)
  );

  const data = {
    labels: timeline,
    datasets: [
      {
        label: "OFAC Compliant",
        data: sumOfacCompliantData,
        backgroundColor: colors.brightRed[500],
        fill: "origin",
      },
      {
        label: "Not OFAC Compliant",
        data: sumNonOfacCompliantData,
        backgroundColor: colors.brightGreen[500],
        fill: "origin",
      },
      
    ],
  };

  if (isIncludingAllBlocks) {
    data.datasets.push({
      label: "Non-MEV-Boost",
      data: nonMevBoostData,
      backgroundColor: "#2f2f2f",
      fill: "origin",
    });
  }
  return data;
};
