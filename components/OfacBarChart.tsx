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
  Switch,
  useBoolean,
  Text,
  VStack,
  Flex,
  chakra,
} from "@chakra-ui/react";
import { sumBy } from "lodash";
import { IoWarning } from "react-icons/io5";

import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import getFormattedDatasets from "../helpers/getFormattedDatasets";
import getPercentage from "../helpers/getPercentage";
import { colors } from "../styles/theme";
import { DefaultText } from "../styles/StyledComponents";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface OfacBarChartProps {
  relayStats: RelayStats[];
  numBlocksSinceMerge: number;
}

const OfacBarChart = (props: OfacBarChartProps) => {
  const { relayStats, numBlocksSinceMerge } = props;
  const [isIncludingAllBlocks, setIsIncludingAllBlocks] = useBoolean(true);

  const barChartData: ChartData<"bar", number[], string> = useMemo(() => {
    const totalBlocksFromRelays = sumBy(relayStats, (stats) => stats.numBlocks);

    const totalBlocks = isIncludingAllBlocks
      ? numBlocksSinceMerge
      : totalBlocksFromRelays;

    const { isOfac, notOfac } = sortAndDivideOfacRelays(relayStats);

    return {
      labels: [""],
      datasets: isIncludingAllBlocks
        ? [
            {
              label: "OFAC Compliant",
              backgroundColor: colors.brightRed[500],
              data: [sumBy(isOfac, (o) => o.numBlocks) / totalBlocks],
            },
            {
              label: "Not OFAC Compliant",
              backgroundColor: colors.brightGreen[500],
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
            ...getFormattedDatasets(isOfac, true, totalBlocks),
            ...getFormattedDatasets(notOfac, false, totalBlocks),
          ],
    };
  }, [isIncludingAllBlocks, numBlocksSinceMerge, relayStats]);

  const percentageCensoring = useMemo(() => {
    const totalBlocksFromRelays = sumBy(relayStats, (stats) => stats.numBlocks);

    const totalBlocks = isIncludingAllBlocks
      ? numBlocksSinceMerge
      : totalBlocksFromRelays;

    const { isOfac } = sortAndDivideOfacRelays(relayStats);
    return Math.floor((100 * sumBy(isOfac, (o) => o.numBlocks)) / totalBlocks);
  }, [isIncludingAllBlocks, numBlocksSinceMerge, relayStats]);

  return (
    <Flex flexDir="column" w="100%" my="40px">
      <HStack justifyContent="flex-end" m="0 10px 5px 0">
        <Switch
          size="sm"
          onChange={setIsIncludingAllBlocks.toggle}
          isChecked={isIncludingAllBlocks}
          colorScheme="brightGreen"
        />
        <DefaultText fontSize="14px">Include all Blocks</DefaultText>
      </HStack>

      <Box
        h="290px"
        bg="#0f0f0f"
        borderRadius="10px"
        border="1px solid #393939"
        p="20px 20px"
      >
        <VStack h="140px">
          <Text
            color="white"
            textAlign="center"
            fontWeight="bold"
            fontSize="1.5rem"
          >
            Post-Merge OFAC Compliant Blocks
          </Text>
          <Text color="white" textAlign="center" fontSize="1rem">
            {isIncludingAllBlocks
              ? "( all post-merge blocks )"
              : "( mev-boost relay blocks only )"}
          </Text>
          <Bar options={ofacBarChartOptions} data={barChartData} />
        </VStack>
        <HStack justify="center" mt="80px">
          <IoWarning color="#ff0" size={24} />
          <PercentBlocksText>
            {`${percentageCensoring}${
              isIncludingAllBlocks
                ? "% enforced OFAC compliance"
                : "% (relayed blocks) enforcing OFAC compliance"
            }`}
          </PercentBlocksText>
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
