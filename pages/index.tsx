import {
  Stack,
  Text,
  Flex,
  VStack,
  chakra,
  Box,
  Image,
} from "@chakra-ui/react";
import { formatNumberForDisplay, parseStringToNumber } from "../helpers/parser";
import { RelayerResponseData } from "../types/relays";
import { getRelayerStats } from "../helpers/getRelayerStats";
import { BLOCK_NUMBER_OF_MERGE } from "../constants/common";
import { ProviderSingleton } from "../constants/provider";
import Faq from "../components/Faq";

const Home = (props: RelayerResponseData) => {
  if (!props.success) return <>Error Display</>;

  return (
    <Box
      backgroundImage="/gradientBg.png"
      backgroundPosition="center"
      backgroundSize="cover"
    >
      <Box backgroundColor="#0000008f">
        <MainContainer>
          <Title>MEV-Boost Relay Observer</Title>
          <SubTitle>
            Some MEV-Boost relays have declared compliance with OFAC sanctions
            and will censor certain transactions.
          </SubTitle>
          <Note>
            <Text fontWeight="bold" color="#00FFA7">
              Protocol level censorship = Bad
            </Text>
            <Text color="#fff">
              Keep Ethereum credibly neutral by adopting a non-censoring
              mev-boost rely.
            </Text>
          </Note>
          <Faq />
          <Footer>
            <Text color="#fff" mb="10px">
              Made by Labrys
            </Text>
            <Image src="/LabrysLogo.png" alt="Labrys" height={50} width={70} />
          </Footer>
        </MainContainer>
      </Box>
    </Box>
  );
};

export default Home;

export async function getServerSideProps(): Promise<{
  props: RelayerResponseData;
}> {
  const [relayStats, currentBlock] = await Promise.all([
    await getRelayerStats(),
    await ProviderSingleton.provider.getBlock("latest"),
  ]);

  if (!relayStats.success) {
    return {
      props: { success: false },
    };
  }

  return {
    props: {
      success: true,
      response: {
        relayStats: relayStats.response,
        numBlocksSinceMerge: currentBlock.number - BLOCK_NUMBER_OF_MERGE,
      },
    },
  };
}

const MainContainer = chakra(Flex, {
  baseStyle: {
    maxWidth: "700px",
    flexDirection: "column",
    margin: "auto",
    alignItems: "center",
    paddingTop: "80px",
    height: "100vh",
  },
});

const Title = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    fontSize: "3rem",
    fontWeight: "bold",
    background:
      "linear-gradient(to right, #00FFD3 0%, #71FFE0 50%, #FFFF00 100%)",
    "-webkit-background-clip": "text",
    "-webkit-text-fill-color": "transparent",
  },
});

const SubTitle = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    noOfLines: 2,
    width: "500px",
    color: "#fff",
  },
});

const Note = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    width: "100%",
    marginTop: "50px",
    marginBottom: "20px",
  },
});

const Footer = chakra(VStack, {
  baseStyle: {
    position: "absolute",
    bottom: "50px",
  },
});
