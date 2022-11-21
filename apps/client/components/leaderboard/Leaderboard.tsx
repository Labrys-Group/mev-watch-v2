import { chakra, HStack, Link, Spacer } from "@chakra-ui/react";
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

const NUM_LEADERBOARD_ROWS = 20;
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
          limit: 30,
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
        <DefaultSpinner h="520px" />
      ) : (
        <LeaderboardTable
          data={
            leaderboardData?.data.leaderboard.slice(0, NUM_LEADERBOARD_ROWS) ??
            []
          }
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
        <Spacer />
        <DefaultSubtitle>
          Data provided by{" "}
          <Link href="https://www.rated.network/" target="_blank">
            Rated.Network
          </Link>
        </DefaultSubtitle>
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
