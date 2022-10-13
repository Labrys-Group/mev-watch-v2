import { Flex } from "@chakra-ui/react";
import { BsTwitter } from "react-icons/bs";
import { HiSpeakerphone } from "react-icons/hi";
import { DefaultText, DefaultBtn } from "../styles/StyledComponents";

const SocialMediaContents = () => {
  return (
    <>
      <DefaultText mt="10px">
        Help us improve this tool for the community
      </DefaultText>
      <Flex mb="20px">
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
    </>
  );
};

export default SocialMediaContents;
