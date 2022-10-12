import { Text, Flex, chakra } from "@chakra-ui/react";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";
import NavBar from "../components/NavBar";
import { PageTitle, DefaultText } from "../styles/StyledComponents";
import OfacLineChart from "../components/OfacLineChart";
import BlockVisualization from "../components/blockVisualization";
import SocialMediaContents from "../components/SocialMediaContents";

const Home = () => {
  return (
    <>
      <NavBar />
      <PageTitle>MEV Watch</PageTitle>
      <DefaultText w="500px" textAlign="center">
        Some MEV-Boost relays are regulated under OFAC and will censor certain
        transactions. Use this tool to observe the effect it&#39;s having on
        Ethereum blocks.
      </DefaultText>

      <OfacBarChart />
      <Note>
        <Text fontWeight="bold" color="brightGreen.500">
          Protocol level censorship = Bad
        </Text>
        <DefaultText>
          Keep Ethereum credibly neutral by adopting a non-censoring mev-boost
          relay.
        </DefaultText>
      </Note>
      <SocialMediaContents />
      <OfacLineChart />
      <BlockVisualization />
      <Faq />
    </>
  );
};

export default Home;

const Note = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    width: "100%",
    marginY: "10px",
    alignItems: "center",
  },
});
