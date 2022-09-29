import { Text, Flex, chakra, Link } from "@chakra-ui/react";
import { RelayerResponseData } from "../types/relays";
import { getRelayerStats } from "../helpers/getRelayerStats";
import { BLOCK_NUMBER_OF_MERGE } from "../constants/common";
import { ProviderSingleton } from "../constants/provider";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";
import { Title, DefaultText } from "../styles/StyledComponents";

const Home = (props: RelayerResponseData) => {
  if (!props.success) return <></>;

  return (
    <>
      <Title>MEV Watch</Title>
      <DefaultText w="500px" textAlign="center">
        Some MEV-Boost relays are regulated under OFAC and will censor certain
        transactions. Use this tool to observe the effect it&#39;s having on
        Ethereum blocks.
      </DefaultText>

      <OfacBarChart
        numBlocksSinceMerge={props.response.numBlocksSinceMerge}
        relayStats={props.response.relayStats}
      />

      <Note>
        <Text fontWeight="bold" color="#00FFA7">
          Protocol level censorship = Bad
        </Text>
        <DefaultText>
          Keep Ethereum credibly neutral by adopting a non-censoring mev-boost
          relay.
        </DefaultText>
      </Note>
      <Faq />
    </>
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

const Note = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    width: "100%",
    marginY: "20px",
  },
});
