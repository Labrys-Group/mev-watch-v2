import { Stack, Center } from "@chakra-ui/react";
import { Leaderboard } from "./Leaderboard";
import { WeNeedYourHelp } from "./WeNeedYourHelp";

export const LeaderboardSection = () => (
  <Stack
    direction={{ base: "column", lg: "row" }}
    gap={{ base: "0px", lg: "30px" }}
  >
    <Leaderboard />
    <Center>
      <WeNeedYourHelp />
    </Center>
  </Stack>
);
