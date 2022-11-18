import { chakra, HStack } from "@chakra-ui/react";
import axios from "axios";
import { TimeFrame, timeFrames } from "consts";
import { last } from "lodash";
import { useState } from "react";
import { useQuery } from "react-query";
import { GetLeaderboardResponse } from "../../pages/api/getLeaderboard";
import {
  DefaultContainer,
  DefaultTitle,
  DefaultSubtitle,
  LabrysGreenText,
  TimeFrameBtn,
  DefaultSpinner,
} from "../../styles/StyledComponents";
import { MevWatchText } from "../MevWatchText";
import { LeaderboardTable } from "./LeaderboardTable";

const timeFrameSubset = timeFrames.slice(0, 4);

export const Leaderboard = () => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(
    last(timeFrameSubset)!
  );

  const { data: leaderboardData, isLoading } = useQuery(
    ["leaderboard", selectedTimeFrame.value],
    () =>
      axios.get<GetLeaderboardResponse>("/api/getLeaderboard", {
        params: {
          limit: 15,
          timeFrame: selectedTimeFrame.label,
        },
      })
  );

  return (
    <LeaderboardContainer>
      <MevWatchText />
      <DefaultTitle>Censorship Offenders Leaderboard</DefaultTitle>
      <DefaultSubtitle color="gray.200">
        Which staking entities are contributing the most towards censorship?
      </DefaultSubtitle>
      {isLoading ? (
        <DefaultSpinner minH="364px" />
      ) : (
        <LeaderboardTable
          data={leaderboardData?.data.leaderboard.slice(0, 5) ?? []}
        />
      )}
      <TimeFrameContainer>
        <LabrysGreenText fontSize="12px">TIME FRAME</LabrysGreenText>
        {timeFrameSubset.map((timeFrame, index) => (
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
      </TimeFrameContainer>
    </LeaderboardContainer>
  );
};

const TimeFrameContainer = chakra(HStack, {
  baseStyle: {
    pt: "15px",
    w: "full",
    borderTop: "2px solid",
    borderColor: "gray.700",
  },
});

const LeaderboardContainer = chakra(DefaultContainer, {
  baseStyle: {
    maxW: "600px",
  },
});

const dummyData = [
  {
    entityName: "Lido",
    entityLogo: "lido",
    totalBlocks: 10000,
    censoredBlocks: 9000,
  },
  {
    entityName: "Coinbase",
    entityLogo: "coinbase",
    totalBlocks: 9000,
    censoredBlocks: 8000,
  },
  {
    entityName: "Kraken",
    entityLogo: "kraken",
    totalBlocks: 8000,
    censoredBlocks: 7000,
  },
  {
    entityName: "Binance",
    entityLogo: "binance",
    totalBlocks: 7000,
    censoredBlocks: 6000,
  },
  {
    entityName: "Staked.us",
    entityLogo: "staked.us",
    totalBlocks: 6000,
    censoredBlocks: 5000,
  },
];
