import React, { useContext, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useQuery } from "react-query";
import axios from "axios";

import {
  HStack,
  Text,
  VStack,
  Flex,
  Box,
  Spacer,
  chakra,
} from "@chakra-ui/react";

import { getLineChartData } from "../helpers/getLineChartData";
import { AggregatedStatsResponse } from "../pages/api/blockStatsAggregated";
import { ofacLineChartOptions } from "../config/lineChart";
import { StatsContext } from "../providers/StatsProvider";
import { DefaultSpinner } from "../styles/StyledComponents";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// const getNowInUnix = () => Math.floor(Date.now() / 1000);

const OfacLineChart = () => {
  const { data: aggregateStatsResponse } = useQuery([], () =>
    axios.get<AggregatedStatsResponse>("/api/blockStatsAggregated", {})
  );

  const { includeAllBlocks, AllBlocksToggle } = useContext(StatsContext);

  const lineChartData = useMemo(() => {
    if (!aggregateStatsResponse) return null;

    return getLineChartData(
      aggregateStatsResponse.data.relayStats,
      includeAllBlocks
    );
  }, [includeAllBlocks, aggregateStatsResponse]);

  return (
    <Flex
      flexDir="column"
      w="100%"
      bg="#0f0f0f"
      borderRadius="10px"
      border="1px solid #393939"
      p="20px"
      pr="40px"
      my="40px"
      boxShadow="rgba(0, 0, 0, 0.56) 0px 22px 70px 4px"
    >
      <VStack>
        <Text
          color="white"
          textAlign="center"
          fontWeight="bold"
          fontSize="1.5rem"
        >
          Post-Merge Daily OFAC Compliant Blocks
        </Text>
        {lineChartData ? (
          <Line options={ofacLineChartOptions} data={lineChartData} />
        ) : (
          <DefaultSpinner minH="150px" />
        )}
      </VStack>

      <HStack justifyContent="right" p="10px 0px 5px" mx="15px">
        <Box w={{ base: "0px", md: "200px" }} /> <Spacer />
        {!includeAllBlocks && (
          <DescriptionText mr="0px">(RELAYED BLOCKS ONLY)</DescriptionText>
        )}
        <Spacer />
        {AllBlocksToggle}
      </HStack>
    </Flex>
  );
};

export default OfacLineChart;

const DescriptionText = chakra(Text, {
  baseStyle: {
    fontSize: "12px",
    textAlign: "center",
    // fontFamily: "GT-America-Mono-Medium",
    color: "white",
  },
});
