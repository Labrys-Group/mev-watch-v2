import { chakra, VStack } from "@chakra-ui/react";
import { DefaultText, LabrysGreenText } from "../../styles/StyledComponents";

export const WeNeedYourHelp = () => (
  <GreenContainer>
    <LabrysGreenText>{`🚨 We need your help!`}</LabrysGreenText>
    <DefaultText fontSize="0.9rem">
      If you stake with a top offender on this list, your ETH is directly
      contributing to the censorship of Ethereum.
    </DefaultText>
    <DefaultText fontSize="0.9rem">
      Screenshot this leaderboard and tweet @ them to disable their censoring
      relays now.
    </DefaultText>
  </GreenContainer>
);

const GreenContainer = chakra(VStack, {
  baseStyle: {
    textAlign: "left",
    border: "1px solid",
    borderColor: "brightGreen.500",
    rounded: "md",
    maxW: "350px",
    p: "10px",
    mb: "30px",
  },
});
