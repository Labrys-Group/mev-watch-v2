import { chakra } from "@chakra-ui/react";
import {
  DefaultContainer,
  DefaultTitle,
  DefaultSubtitle,
} from "../../styles/StyledComponents";
import { MevWatchText } from "../MevWatchText";
import { LeaderboardTable } from "./LeaderboardTable";

export const Leaderboard = () => {
  return (
    <LeaderboardContainer>
      <MevWatchText />
      <DefaultTitle>Censorship Offenders Leaderboard</DefaultTitle>
      <DefaultSubtitle color="gray.200">
        Which staking entities are contributing the most towards censorship?
      </DefaultSubtitle>
      <LeaderboardTable data={dummyData} />
    </LeaderboardContainer>
  );
};

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