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
import { faqs } from "consts";

import markdownStyles from "../styles/markdownStyles";

const Faq = () => {
  return (
    <Accordion allowMultiple defaultIndex={[-1]} w="100%" mt="30px">
      {faqs.map((faq) => (
        <AccordionItem key={faq.title} py="10px" borderColor="whiteAlpha.400">
          {({ isExpanded }) => (
            <Box>
              <AccordionButton>
                {isExpanded ? (
                  <AiOutlineDown color="#fff" />
                ) : (
                  <AiOutlineRight color="#fff" />
                )}
                <Flex ml="20px">
                  <Text fontWeight="bold" color="white" textAlign="left">
                    {faq.title}
                  </Text>
                </Flex>
              </AccordionButton>
              <AccordionPanel>
                <Box color="white" ml="40px">
                  <ReactMarkdown components={markdownStyles}>
                    {faq.content}
                  </ReactMarkdown>
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
