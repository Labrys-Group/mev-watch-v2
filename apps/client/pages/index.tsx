import { Text, Flex, chakra, Box } from "@chakra-ui/react";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";
import NavBar from "../components/NavBar";
import { PageTitle, DefaultText } from "../styles/StyledComponents";
import OfacLineChart from "../components/OfacLineChart";
import BlockVisualization from "../components/blockVisualization";
import SocialMediaContents from "../components/SocialMediaContents";
import { LeaderboardSection } from "../components/leaderboard/LeaderboardSection";
import { GetStaticProps } from "next";
import { connect } from "database/dist";
import { getBlockStatsAggregated } from "../helpers/getBlockStatsAggregated";
import { AggregatedStats } from "../types";

interface HomeProps {
  initialAggregatedStats: AggregatedStats[];
}

const Home = ({ initialAggregatedStats }: HomeProps) => {
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
      <LeaderboardSection />
      <Note>
        <Text fontWeight="bold" color="brightGreen.500">
          Protocol level censorship = Bad
        </Text>
        <DefaultText textAlign="center">
          Keep Ethereum credibly neutral by adopting a non-censoring mev-boost
          relay.
        </DefaultText>
      </Note>
      <SocialMediaContents />
      <OfacLineChart initialData={initialAggregatedStats} />
      <BlockVisualization />
      <Box mt="50px" />
      <Faq />
    </>
  );
};

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  await connect();
  const aggregatedStats = await getBlockStatsAggregated();

  return {
    props: {
      initialAggregatedStats: JSON.parse(JSON.stringify(aggregatedStats)),
    },
    // Revalidate every 5 minutes
    revalidate: 300,
  };
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
