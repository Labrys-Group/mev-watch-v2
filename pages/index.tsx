import { Text, Flex, chakra, Link } from "@chakra-ui/react";
import { RelayerResponseData } from "../types/relays";
import { getRelayerStats } from "../helpers/getRelayerStats";
import { BLOCK_NUMBER_OF_MERGE } from "../constants/common";
import { ProviderSingleton } from "../constants/provider";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";
import { Title, DefaultText, StyledBtn } from "../styles/StyledComponents";
import { BsTwitter } from "react-icons/bs";
import { HiSpeakerphone } from "react-icons/hi";

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
      <DefaultText mt="10px">
        Help us improve this tool for the community
      </DefaultText>
      <Flex mb="70px">
        <StyledBtn
          aria-label="provide feedback"
          leftIcon={<HiSpeakerphone />}
          size="sm"
          onClick={() =>
            window.open("https://labrys-form.typeform.com/mevwatch-survey")
          }
        >
          Provide Feedback
        </StyledBtn>
        <StyledBtn
          aria-label="labrys-twitter"
          leftIcon={<BsTwitter />}
          size="sm"
          onClick={() =>
            window.open(
              "https://twitter.com/intent/tweet?text=Some%20MEV-Boost%20relays%20are%20regulated%20under%20OFAC%20and%20will%20censor%20certain%20transactions.%0AUse%20this%20tool%20to%20observe%20the%20effect%20it%27s%20having%20on%20Ethereum%20blocks.%0Ahttps%3A%2F%2Fwww.mevwatch.info%2F"
            )
          }
        >
          Share
        </StyledBtn>
      </Flex>

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
