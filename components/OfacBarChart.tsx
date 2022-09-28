import React, { useMemo } from "react";
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
import { Box, HStack, Stack, Switch, useBoolean, Text } from "@chakra-ui/react";
import { sumBy } from "lodash";
import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import getFormattedDatasets from "../helpers/getFormattedDatasets";
import getCombinedRelay from "../helpers/getCombinedRelay";
import getPercentage from "../helpers/getPercentage";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OfacBarChart = ({
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
      datasets: isIncludingAllBlocks
        ? [
            ...getFormattedDatasets(
              [getCombinedRelay(isOfac, "Censoring Relays")],
              true,
              totalBlocks,
              true
            ),
            ...getFormattedDatasets(
              [getCombinedRelay(notOfac, "Non-Censoring")],
              false,
              totalBlocks,
              true
            ),
            {
              label: "Non-MEV-Boost",
              backgroundColor: "#CBCBCB",
              data: [100 - getPercentage([...isOfac, ...notOfac], totalBlocks)],
            },
          ]
        : [
            // Display all the OFAC compliant relays first and then the non-OFAC relays
            ...getFormattedDatasets(isOfac, true, totalBlocks, false),
            ...getFormattedDatasets(notOfac, false, totalBlocks, false),
          ],
    };
  }, [isIncludingAllBlocks, numBlocksSinceMerge, relayStats]);

  return (
    <Stack w="100%" my="20px">
      <HStack justifyContent="flex-end" mb="20px">
        <Switch
          onChange={setIsIncludingAllBlocks.toggle}
          isChecked={isIncludingAllBlocks}
          colorScheme="teal"
        />
        <Text color="#fff" w="130px" textAlign="end">
          {isIncludingAllBlocks ? "Include" : "Exclude"} all Blocks
        </Text>
      </HStack>

      <Box
        h="230px"
        bg="#0f0f0f"
        my="20px"
        borderRadius="10px"
        border="1px solid #393939"
        p="20px 20px 70px"
      >
        <Text
          color="#fff"
          textAlign="center"
          fontWeight="bold"
          fontSize="1.5rem"
        >
          OFAC Censoring Blocks
        </Text>
        <Bar options={ofacBarChartOptions} data={barChartData} />
      </Box>
    </Stack>
  );
};

export default OfacBarChart;
