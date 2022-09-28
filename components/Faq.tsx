import {
  Flex,
  Accordion,
  AccordionItem,
  AccordionButton,
  Text,
  Box,
  AccordionPanel,
} from "@chakra-ui/react";
import { AiOutlineRight, AiOutlineDown } from "react-icons/ai";
import ReactMarkdown from "react-markdown";

const faqs: { title: string; content: string }[] = [
  {
    title: "What is this metric?",
    content: "Not implemented",
  },
  {
    title: "What can I do as a Validator?",
    content: "Not implemented",
  },
  {
    title: "How is OFAC compliance (censorship) status determined?",
    content: "Not implemented",
  },
  {
    title: "Is Labrys aginst regulation?",
    content:
      "No. Regulation is inevitable as the crypto industry matures. All persons and entities within the United States, all U.S. incorporated entities and their foreign branches who operate Ethereum POS validators should seek their own advice on whether their validators must produce OFAC compliant blocks.However, ensuring that Ethereum remains credibly neutral on the global stage is important. All persons and entities operating validators outside of the U.S. should consider running non-censoring relays for the benefit of the network.",
  },
];

const Faq = () => {
  return (
    <Accordion allowMultiple w="100%" mt="30px">
      {faqs.map((faq) => (
        <AccordionItem key={faq.title} py="10px">
          {({ isExpanded }) => (
            <Box>
              <AccordionButton>
                {isExpanded ? (
                  <AiOutlineDown color="#fff" />
                ) : (
                  <AiOutlineRight color="#fff" />
                )}
                <Flex ml="20px">
                  <Text fontWeight="bold" color="#fff">
                    {faq.title}
                  </Text>
                </Flex>
              </AccordionButton>
              <AccordionPanel>
                <Box color="white" ml="40px">
                  <ReactMarkdown>{faq.content}</ReactMarkdown>
                </Box>
              </AccordionPanel>
            </Box>
          )}
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default Faq;
