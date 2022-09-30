import { Text, Flex, chakra } from "@chakra-ui/react";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";
import { Title, DefaultText } from "../styles/StyledComponents";

const Home = () => {
  return (
    <>
      <Title>MEV Watch</Title>
      <DefaultText w="500px" textAlign="center">
        Some MEV-Boost relays are regulated under OFAC and will censor certain
        transactions. Use this tool to observe the effect it&#39;s having on
        Ethereum blocks.
      </DefaultText>

      <OfacBarChart />

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

const Note = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    width: "100%",
    marginY: "20px",
  },
});
