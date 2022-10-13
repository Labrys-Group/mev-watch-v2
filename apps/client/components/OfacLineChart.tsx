import React, { useContext, useEffect, useMemo, useState } from "react";
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
  ActiveElement,
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
  Stack,
} from "@chakra-ui/react";

import { getLineChartData } from "../helpers/getLineChartData";
import { AggregatedStatsResponse } from "../pages/api/blockStatsAggregated";
import { ofacLineChartOptions } from "../config/lineChart";
import { StatsContext } from "../providers/StatsProvider";
import { DefaultSpinner } from "../styles/StyledComponents";
import { last } from "lodash";
import { IoWarning } from "react-icons/io5";

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

const OfacLineChart = () => {
  const { data: aggregateStatsResponse } = useQuery([], () => {
    const data = axios.get<AggregatedStatsResponse>(
      "/api/blockStatsAggregated",
      {}
    );
    if (!aggregateStatsResponse?.data) return data;
    setHoverIndex(aggregateStatsResponse?.data.relayStats.length - 1);
    return data;
  });

  const { includeAllBlocks, AllBlocksToggle } = useContext(StatsContext);
  const [hoverIndex, setHoverIndex] = useState<number>(0);

  const lineChartData = useMemo(() => {
    if (!aggregateStatsResponse) return null;

    return getLineChartData(
      aggregateStatsResponse.data.relayStats,
      includeAllBlocks
    );
  }, [includeAllBlocks, aggregateStatsResponse]);

  const compliancePercentage = useMemo(() => {
    const stats = aggregateStatsResponse?.data.relayStats[hoverIndex];

    if (!stats) return 0;
    return includeAllBlocks
      ? Math.round((stats.censoringBlocks / stats.totalBlocks) * 100)
      : Math.round(
          (stats.censoringBlocks /
            (stats.censoringBlocks + stats.nonCensoringBlocks)) *
            100
        );
  }, [hoverIndex, includeAllBlocks, aggregateStatsResponse]);

  const onHoverCallback = (elements: ActiveElement[]) => {
    if (!elements.length) {
      if (!aggregateStatsResponse?.data) return;
      setHoverIndex(aggregateStatsResponse?.data.relayStats.length - 1);
    }
    setHoverIndex(elements[0].index);
  };

  const resetIndex = () => {
    if (!aggregateStatsResponse?.data) return;
    setHoverIndex(aggregateStatsResponse?.data.relayStats.length - 1);
  };

  useEffect(() => resetIndex(), [aggregateStatsResponse]);

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
          <Line
            onMouseLeave={resetIndex}
            options={ofacLineChartOptions(onHoverCallback)}
            data={lineChartData}
          />
        ) : (
          <DefaultSpinner minH="150px" />
        )}
      </VStack>

      <Stack
        direction={{ base: "column", md: "row" }}
        justifyContent="right"
        p="0px 0px 5px"
        mx="15px"
      >
        <Box w={{ base: "0px", md: "200px" }} /> <Spacer />
        <HStack justify="center" mt="20px" mb="10px" h="20px">
          {lineChartData && (
            <>
              <IoWarning color="#ff0" size={24} />
              <PercentBlocksText>
                {`${compliancePercentage}${
                  includeAllBlocks
                    ? "% enforced OFAC compliance"
                    : "% (relayed blocks) enforcing OFAC compliance"
                }`}
              </PercentBlocksText>
            </>
          )}
        </HStack>
        <Spacer />
        {AllBlocksToggle}
      </Stack>
    </Flex>
  );
};

const PercentBlocksText = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    color: "white",
  },
});

export default OfacLineChart;
