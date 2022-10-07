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
  Spinner,
  Center,
} from "@chakra-ui/react";
import { sumBy } from "lodash";
import { IoWarning } from "react-icons/io5";

import { sortAndDivideOfacRelays } from "../helpers/relayProcessing";

import { GetBlockStatsResponse } from "../pages/api/blockStats";
import {
  DefaultText,
  LabrysGreenText,
  DefaultTitle,
  DefaultContainer,
  DefaultSwitch,
} from "../styles/StyledComponents";
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
    timeFrames[timeFrames.length - 1]
  );

  const [dateRange, setDateRange] = useState<DateRange>({
    startTime: 0,
    endTime: getNowInUnix(),
  });

  const { data: blockStatsResponse } = useQuery(
    ["todos", selectedTimeFrame.value],
    () =>
      axios.post<GetBlockStatsResponse>("/api/blockStats", {
        startTime: selectedTimeFrame.value,
        endTime: getNowInUnix(),
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

  console.log("tHIS", barChartData);
  return (
    <DefaultContainer>
      <VStack h="130px">
        <DefaultTitle>Post-Merge OFAC Compliant Blocks</DefaultTitle>
        {barChartData ? (
          <Bar options={ofacBarChartOptions} data={barChartData} />
        ) : (
          <Flex h="100%" w="100%" alignItems="end" justifyContent="center">
            <Spinner color="#00FFA7" size="xl" />
          </Flex>
        )}
      </VStack>

      <HStack justify="center" mt="40px" h="20px">
        {barChartData && (
          <>
            <IoWarning color="#ff0" size={24} />
            <PercentBlocksText>
              {`${percentageCensoring}${
                isIncludingAllBlocks
                  ? "% enforced OFAC compliance"
                  : "% (relayed blocks) enforcing OFAC compliance"
              }`}
            </PercentBlocksText>
          </>
        )}
      </HStack>

      <HStack justifyContent="space-between" p="20px 0px 5px" mx="15px">
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
        <DefaultSwitch
          label="Include all Blocks"
          onChange={setIsIncludingAllBlocks.toggle}
          isChecked={isIncludingAllBlocks}
        />
      </HStack>
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
