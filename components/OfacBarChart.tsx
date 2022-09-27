import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { RelayStats } from "../types/relays";
import { ofacBarChartOptions } from "../config/barChart";
import {
  Box,
  Button,
  HStack,
  Stack,
  Switch,
  useBoolean,
  Text,
} from "@chakra-ui/react";
import { sumBy } from "lodash";
import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DatasetEntry {
  label: string;
  backgroundColor: string;
  data: number[];
}

const getBackgroundColor = (
  isOfacCompliant: boolean,
  index: number,
  total: number
) => {
  // Adjusting the opacity of the row based on its index and the rows are ordered by numBlocks
  const opacity = 1.2 - index / total;

  return isOfacCompliant
    ? `rgba(255, 0, 0, ${opacity})`
    : `rgba(0, 255, 0, ${opacity})`;
};

const getFormattedDatasets = (
  relayStats: RelayStats[],
  totalBlocks: number,
  isOfacCompliant: boolean
): DatasetEntry[] =>
  relayStats.map((relay, idx) => {
    const percentageOfBlocks = (relay.numBlocks / totalBlocks) * 100;

    return {
      label: relay.name,
      backgroundColor: getBackgroundColor(
        isOfacCompliant,
        idx,
        relayStats.length
      ),
      data: [percentageOfBlocks],
    };
  });

export const OfacBarChart = ({
  relayStats,
  numBlocksSinceMerge,
}: {
  relayStats: RelayStats[];
  numBlocksSinceMerge: number;
}) => {
  const [isIncludingAllBlocks, setIsIncludingAllBlocks] = useBoolean(false);

  const barChartData: ChartData<"bar", number[], string> = useMemo(() => {
    const totalBlocksFromRelays = sumBy(relayStats, (stats) => stats.numBlocks);

    const totalBlocks =
      totalBlocksFromRelays + (isIncludingAllBlocks ? numBlocksSinceMerge : 0);

    const { isOfac, notOfac } = sortAndDivideOfacRelays(relayStats);

    return {
      labels: ["OFAC"],
      datasets: [
        // Display all the OFAC compliant relays first and then the non-OFAC relays
        ...getFormattedDatasets(isOfac, totalBlocks, true),
        ...getFormattedDatasets(notOfac, totalBlocks, false),
      ],
    };
  }, [isIncludingAllBlocks, numBlocksSinceMerge, relayStats]);

  return (
    <Stack py="20px" w="100%">
      <HStack justifyContent="flex-end">
        <Switch
          onChange={setIsIncludingAllBlocks.toggle}
          isChecked={isIncludingAllBlocks}
          colorScheme="teal"
        />
        <Text color="#fff" w="130px" textAlign="end">
          {isIncludingAllBlocks ? "Exclude" : "Include"} all Blocks
        </Text>
      </HStack>
      <Box h={200}>
        <Bar options={ofacBarChartOptions} data={barChartData} />
      </Box>
    </Stack>
  );
};
