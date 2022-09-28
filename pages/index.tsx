import {
  Text,
  Flex,
  VStack,
  chakra,
  Box,
  Image,
  HStack,
} from "@chakra-ui/react";
import { RelayerResponseData } from "../types/relays";
import { getRelayerStats } from "../helpers/getRelayerStats";
import { BLOCK_NUMBER_OF_MERGE } from "../constants/common";
import { ProviderSingleton } from "../constants/provider";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";

import { AiTwotoneHeart } from "react-icons/ai";

const Home = (props: RelayerResponseData) => {
  if (!props.success) return <>Error Display</>;

  console.log(props);

  return (
    <Box
      backgroundImage="/gradientBg.png"
      backgroundPosition="center"
      backgroundSize="cover"
      w="100vw"
      minH="100vh"
      minW="700px"
    >
      <MainContainer>
        <BodyContainer>
          <Title>MEV-Boost Relay Observer</Title>
          <SubTitle>
            Some MEV-Boost relays have declared compliance with OFAC sanctions
            and will censor certain transactions.
          </SubTitle>
          <OfacBarChart
            numBlocksSinceMerge={props.response.numBlocksSinceMerge}
            relayStats={props.response.relayStats}
          />

          <Note>
            <Text fontWeight="bold" color="#00FFA7">
              Protocol level censorship = Bad
            </Text>
            <SubTitle color="#fff" textAlign="left" w="auto">
              Keep Ethereum credibly neutral by adopting a non-censoring
              mev-boost rely.
            </SubTitle>
          </Note>
          <Faq />
        </BodyContainer>
        <Footer>
          <Flex alignItems="center">
            <Text color="#fff" mb="10px" whiteSpace="nowrap">
              Made with
            </Text>
            <Box mx="10px" mb="7px">
              <AiTwotoneHeart color="red" size="20px" />
            </Box>
            <Text color="#fff" mb="10px" whiteSpace="nowrap">
              by Labrys
            </Text>
          </Flex>
          <Image src="/LabrysLogo.png" alt="Labrys" height={50} width={70} />
        </Footer>
      </MainContainer>
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
    flexDirection: "column",
    margin: "0 auto",
    backgroundColor: "#0000007e",
    minHeight: "100vh",
    width: "100%",
  },
});

const BodyContainer = chakra(Flex, {
  baseStyle: {
    minWidth: "700px",
    maxWidth: "1000px",
    width: "100%",
    minHeight: "calc(100vh - 180px)",
    flexDirection: "column",
    margin: "0 auto",
    alignItems: "center",
    paddingTop: "80px",
    paddingX: "20px",
  },
});

const Title = chakra(Text, {
  baseStyle: {
    fontFamily: "GT-America-Extended-Bold",
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
    fontFamily: "GT-America-Mono-Medium",
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
    paddingTop: "50px",
    paddingBottom: "30px",
  },
});
