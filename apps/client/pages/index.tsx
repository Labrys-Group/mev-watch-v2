import { Text, Flex, chakra } from "@chakra-ui/react";
import Faq from "../components/Faq";
import OfacBarChart from "../components/OfacBarChart";
import { PageTitle, DefaultText, DefaultBtn } from "../styles/StyledComponents";
import { BsTwitter } from "react-icons/bs";
import { HiSpeakerphone } from "react-icons/hi";
import BlockVisualization from "../components/blockVisualization";

const Home = () => {
  return (
    <>
      <PageTitle>MEV Watch</PageTitle>
      <DefaultText w="500px" textAlign="center">
        Some MEV-Boost relays are regulated under OFAC and will censor certain
        transactions. Use this tool to observe the effect it&#39;s having on
        Ethereum blocks.
      </DefaultText>

      <OfacBarChart />

      <DefaultText mt="10px">
        Help us improve this tool for the community
      </DefaultText>
      <Flex mb="70px">
        <DefaultBtn
          aria-label="provide feedback"
          leftIcon={<HiSpeakerphone />}
          size="sm"
          onClick={() =>
            window.open("https://labrys-form.typeform.com/mevwatch-survey")
          }
        >
          Provide Feedback
        </DefaultBtn>
        <DefaultBtn
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
        </DefaultBtn>
      </Flex>

      <BlockVisualization />

      <Note>
        <Text fontWeight="bold" color="brightGreen.500">
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
