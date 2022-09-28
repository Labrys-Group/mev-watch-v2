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
import {
  Box,
  HStack,
  Stack,
  Switch,
  useBoolean,
  Text,
  VStack,
  Flex,
  chakra,
} from "@chakra-ui/react";
import { sumBy } from "lodash";
import { IoWarning} from "react-icons/io5";


import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import getFormattedDatasets from "../helpers/getFormattedDatasets";
import getCombinedRelay from "../helpers/getCombinedRelay";
import getPercentage from "../helpers/getPercentage";
import { greenGradient, redGradient } from "../styles/chartColor";

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

    const totalBlocks = isIncludingAllBlocks
      ? numBlocksSinceMerge
      : totalBlocksFromRelays;

    const { isOfac, notOfac } = sortAndDivideOfacRelays(relayStats);

    console.log("TOTAL", totalBlocksFromRelays, numBlocksSinceMerge);
    return {
      labels: [""],
      datasets: isIncludingAllBlocks
        ? [
            {
              label: "OFAC Compliant",
              backgroundColor: redGradient[0],
              data: [sumBy(isOfac, (o) => o.numBlocks) / totalBlocks],
            },
            {
              label: "Not OFAC Compliant",
              backgroundColor: greenGradient[0],
              data: [sumBy(notOfac, (o) => o.numBlocks) / totalBlocks],
            },
            {
              label: "Non-MEV-Boost",
              backgroundColor: "#CBCBCB",
              data: [1 - getPercentage([...isOfac, ...notOfac], totalBlocks)],
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
    <Flex flexDir="column" w="100%" mt="100px" h="40vh">
      <HStack justifyContent="flex-end" mb="5px">
        <Switch
          onChange={setIsIncludingAllBlocks.toggle}
          isChecked={isIncludingAllBlocks}
          colorScheme="teal"
        />
        <Text color="#fff" w="140px" textAlign="end" whiteSpace="nowrap">
          Include all Blocks
        </Text>
      </HStack>

      <Box
        h="260px"
        bg="#0f0f0f"
        borderRadius="10px"
        border="1px solid #393939"
        p="20px 20px 130px"
      >
        <VStack mb="20px" h="70px">
          <Text
            color="#fff"
            textAlign="center"
            fontWeight="bold"
            fontSize="1.5rem"
          >
            Post-Merge OFAC Compliant Blocks
          </Text>
          <Text color="#fff" textAlign="center" fontSize="1rem">
            {isIncludingAllBlocks
              ? "( all post-merge blocks )"
              : "( mev-boost relay blocks only )"}
          </Text>
        </VStack>
        <Bar options={ofacBarChartOptions} data={barChartData} />
        <HStack justify="center">
        <IoWarning color="orange" size={24} />
        <PercentBlocksText>__% of mev-boost blocks censoring</PercentBlocksText>
        </HStack>
      </Box>
    </Flex>
  );
};


const PercentBlocksText = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    color: "white",
  },
});

export default OfacBarChart;
