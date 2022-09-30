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
import { useQuery } from "react-query";
import axios from "axios";

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

import getUnixTime from "date-fns/getUnixTime";
import sub from "date-fns/sub";

import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import { GetBlockStatsResponse } from "../pages/api/blockStats";
import { DefaultText, LabrysGreenText } from "../styles/StyledComponents";
import { getBarChartData } from "../helpers/getBarChartData";

import { timeFrames } from "consts";
import { TimeFrame } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DateRange {
  startTime: number;
  endTime: number;
}

const getNowInUnix = () => Math.floor(Date.now() / 1000);

const OfacBarChart = () => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(
    timeFrames[0]
  );

  const [dateRange, setDateRange] = useState<DateRange>({
    startTime: 0,
    endTime: getNowInUnix(),
  });

  const { data: blockStatsResponse } = useQuery(["todos", dateRange], () =>
    axios.post<GetBlockStatsResponse>("/api/blockStats", {
      startTime: dateRange.startTime,
      endTime: dateRange.endTime,
    })
  );

  const [isIncludingAllBlocks, setIsIncludingAllBlocks] = useBoolean(true);

  const barChartData: ChartData<"bar", number[], string> | null =
    useMemo(() => {
      if (!blockStatsResponse) return null;

      return getBarChartData(
        blockStatsResponse.data.relayStats,
        blockStatsResponse.data.totalBlocks,
        isIncludingAllBlocks
      );
    }, [isIncludingAllBlocks, blockStatsResponse]);

  const percentageCensoring = useMemo(() => {
    if (!blockStatsResponse) return null;

    const totalBlocksFromRelays = sumBy(
      blockStatsResponse.data.relayStats,
      (stats) => stats.numBlocks
    );

    const totalBlocks = isIncludingAllBlocks
      ? blockStatsResponse.data.totalBlocks
      : totalBlocksFromRelays;

    const { isOfac } = sortAndDivideOfacRelays(
      blockStatsResponse.data.relayStats
    );
    return Math.floor((100 * sumBy(isOfac, (o) => o.numBlocks)) / totalBlocks);
  }, [isIncludingAllBlocks, blockStatsResponse]);

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
      p="20px"
      my="40px"
    >
      <VStack h="130px">
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

      <HStack justify="center" mt="40px">
        <IoWarning color="#ff0" size={24} />
        <PercentBlocksText>
          {`${percentageCensoring}${
            isIncludingAllBlocks
              ? "% enforced OFAC compliance"
              : "% (relayed blocks) enforcing OFAC compliance"
          }`}
        </PercentBlocksText>
      </HStack>

      <HStack justifyContent="space-between" py="20px" mx="15px">
        <HStack>
          <LabrysGreenText fontSize="12px">TIME FRAME</LabrysGreenText>
          {timeFrames.map((timeFrame, index) => (
            <TimeFrameBtn
              onClick={() => setSelectedTimeFrame(timeFrames[index])}
              size="sm"
              borderColor={
                timeFrame === selectedTimeFrame ? "#00FFA7" : "transparent"
              }
              background={
                timeFrame === selectedTimeFrame ? "#ffffff3c" : "transparent"
              }
            >
              {timeFrame.label}
            </TimeFrameBtn>
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

export default OfacBarChart;

const PercentBlocksText = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    color: "white",
  },
});

const TimeFrameBtn = chakra(Button, {
  baseStyle: {
    borderRadius: "2px",
    borderWidth: "1px",
    color: "white",
    fontSize: "14px",
    background: "transparent",
    _hover: {
      borderColor: "#00FFA7",
      background: "transparent",
    },
  },
});
