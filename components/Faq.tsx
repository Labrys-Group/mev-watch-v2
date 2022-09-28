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

const faqs: { title: string; content: string }[] = [
  {
    title: "What can I do as a Validator?",
    content: "Not implemented",
  },
  {
    title: "How do we solve this problem?",
    content: "Not implemented",
  },
  {
    title: "How is OFAC compilance (censorship) status determined?",
    content: "Not implemented",
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
                <Text ml="40px" color="#fff">
                  {faq.content}
                </Text>
              </AccordionPanel>
            </Box>
          )}
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default Faq;
