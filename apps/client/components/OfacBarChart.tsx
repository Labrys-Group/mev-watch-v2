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
import { useQuery } from "react-query";

import { ofacBarChartOptions } from "../config/barChart";
import {
  HStack,
  Switch,
  useBoolean,
  Text,
  VStack,
  Flex,
  chakra,
  Button,
} from "@chakra-ui/react";
import { sumBy } from "lodash";
import { IoWarning } from "react-icons/io5";

import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import getFormattedDatasets from "../helpers/getFormattedDatasets";
import getPercentage from "../helpers/getPercentage";
import axios from "axios";
import { GetBlockStatsResponse } from "../pages/api/blockStats";
import { colors } from "../styles/theme";
import { DefaultText, LabrysGreenText } from "../styles/StyledComponents";
import { timeFrames } from "consts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OfacBarChart = () => {
  const { data: blockStatsResponse, isLoading } = useQuery(["todos"], () =>
    axios.get<GetBlockStatsResponse>("/api/blockStats")
  );

  const [isIncludingAllBlocks, setIsIncludingAllBlocks] = useBoolean(true);

  const barChartData: ChartData<"bar", number[], string> | null =
    useMemo(() => {
      if (!blockStatsResponse) return null;

      const {
        data: { relayStats, totalBlocks },
      } = blockStatsResponse;

      const totalBlocksFromRelays = sumBy(
        relayStats,
        (stats) => stats.numBlocks
      );

      // const totalBlocks = isIncludingAllBlocks
      //   ? numBlocksSinceMerge
      //   : totalBlocksFromRelays;

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
    }, [isIncludingAllBlocks, blockStatsResponse]);

  const percentageCensoring = useMemo(() => {
    if (!blockStatsResponse) return null;

    const totalBlocksFromRelays = sumBy(
      blockStatsResponse.data.relayStats,
      (stats) => stats.numBlocks
    );

    // const totalBlocks = isIncludingAllBlocks
    //   ? numBlocksSinceMerge
    //   : totalBlocksFromRelays;

    const { isOfac } = sortAndDivideOfacRelays(
      blockStatsResponse.data.relayStats
    );
    return Math.floor(
      (100 * sumBy(isOfac, (o) => o.numBlocks)) /
        blockStatsResponse.data.totalBlocks
    );
  }, [isIncludingAllBlocks, blockStatsResponse]);

  // TODO: Loader

  if (!barChartData) {
    return <Flex>Loading...</Flex>;
  }

  return (
    <Flex
      flexDir="column"
      w="100%"
      bg="#0f0f0f"
      borderRadius="10px"
      border="1px solid #393939"
      p="30px 20px"
      my="40px"
    >
      <VStack h="200px" border="1px solid red">
        <Text
          color="white"
          textAlign="center"
          fontWeight="bold"
          fontSize="1.5rem"
        >
          Post-Merge OFAC Compliant Blocks
        </Text>
        <Bar options={ofacBarChartOptions} data={barChartData} />
      </VStack>

      <HStack justify="center" mt="80px" border="1px solid red">
        <IoWarning color="#ff0" size={24} />
        <PercentBlocksText>
          {`${percentageCensoring}${
            isIncludingAllBlocks
              ? "% enforced OFAC compliance"
              : "% (relayed blocks) enforcing OFAC compliance"
          }`}
        </PercentBlocksText>
      </HStack>

      <HStack justifyContent="space-between" border="1px solid red" py="20px">
        <HStack>
          <LabrysGreenText fontSize="12px">TIME FRAME</LabrysGreenText>
          {timeFrames.map((timeFrame) => (
            <Button onClick={() => alert(timeFrame.value)}>
              {timeFrame.labe}
            </Button>
          ))}
        </HStack>
        <HStack>
          <Switch
            size="sm"
            onChange={setIsIncludingAllBlocks.toggle}
            isChecked={isIncludingAllBlocks}
            colorScheme="brightGreen"
          />
          <DefaultText fontSize="14px">Include all Blocks</DefaultText>
        </HStack>
      </HStack>
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
