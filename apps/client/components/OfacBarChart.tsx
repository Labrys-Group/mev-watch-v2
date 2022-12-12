import React, { useContext, useMemo, useState } from "react";
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
import axios from "axios";

import { ofacBarChartOptions } from "../config/barChart";
import { HStack, Text, VStack, chakra, Button, Stack } from "@chakra-ui/react";
import { sumBy } from "lodash";
import { IoWarning } from "react-icons/io5";

import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import { GetBlockStatsResponse } from "../pages/api/blockStats";
import { getBarChartData } from "../helpers/getBarChartData";
import {
  LabrysGreenText,
  DefaultTitle,
  DefaultContainer,
  DefaultSpinner,
  TimeFrameBtn,
} from "../styles/StyledComponents";

import { timeFrames } from "consts";
import { TimeFrame } from "../types";
import { StatsContext } from "../providers/StatsProvider";
import { MevWatchText } from "./MevWatchText";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const getNowInUnix = () => Math.floor(Date.now() / 1000);

const OfacBarChart = () => {
  const { includeAllBlocks, AllBlocksToggle } = useContext(StatsContext);

  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(
    timeFrames[timeFrames.length - 3]
  );

  const { data: blockStatsResponse } = useQuery(
    ["todos", selectedTimeFrame.value],
    () =>
      axios.post<GetBlockStatsResponse>("/api/blockStats", {
        startTime: selectedTimeFrame.value,
        endTime: getNowInUnix(),
      })
  );

  const barChartData: ChartData<"bar", number[], string> | null =
    useMemo(() => {
      if (!blockStatsResponse) return null;

      return getBarChartData(
        blockStatsResponse.data.relayStats,
        blockStatsResponse.data.totalBlocks,
        includeAllBlocks
      );
    }, [includeAllBlocks, blockStatsResponse]);

  const percentageCensoring = useMemo(() => {
    if (!blockStatsResponse) return null;

    const totalBlocksFromRelays = sumBy(
      blockStatsResponse.data.relayStats,
      (stats) => stats.numBlocks
    );

    const totalBlocks = includeAllBlocks
      ? blockStatsResponse.data.totalBlocks
      : totalBlocksFromRelays;

    const { isOfac } = sortAndDivideOfacRelays(
      blockStatsResponse.data.relayStats
    );
    return Math.round((100 * sumBy(isOfac, (o) => o.numBlocks)) / totalBlocks);
  }, [includeAllBlocks, blockStatsResponse]);

  return (
    <DefaultContainer>
      <MevWatchText />
      <VStack maxH={{ base: "190px", md: "130px" }}>
        <DefaultTitle>Post-Merge OFAC Compliant Blocks</DefaultTitle>
        {barChartData ? (
          <Bar options={ofacBarChartOptions} data={barChartData} />
        ) : (
          <DefaultSpinner minH="120px" />
        )}
      </VStack>

      <HStack justify="center" mt="20px" mb="10px" h="20px">
        {barChartData && (
          <>
            <IoWarning color="#ff0" size={24} />
            <PercentBlocksText>
              {`${percentageCensoring}${
                includeAllBlocks
                  ? "% enforced OFAC compliance"
                  : "% (relayed blocks) enforcing OFAC compliance"
              }`}
            </PercentBlocksText>
          </>
        )}
      </HStack>

      <Stack
        direction={{ base: "column", md: "row" }}
        justifyContent="space-between"
        p="20px 0px 5px"
        mx="15px"
      >
        <HStack>
          <LabrysGreenText fontSize="12px">TIME FRAME</LabrysGreenText>
          {timeFrames.map((timeFrame, index) => (
            <TimeFrameBtn
              key={timeFrame.value}
              onClick={() => setSelectedTimeFrame(timeFrames[index])}
              size="sm"
              borderColor={
                timeFrame === selectedTimeFrame
                  ? "brightGreen.500"
                  : "transparent"
              }
              background={
                timeFrame === selectedTimeFrame ? "#ffffff3c" : "transparent"
              }
            >
              {timeFrame.label}
            </TimeFrameBtn>
          ))}
        </HStack>
        {AllBlocksToggle}
      </Stack>
    </DefaultContainer>
  );
};

export default OfacBarChart;

const PercentBlocksText = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    color: "white",
  },
});
