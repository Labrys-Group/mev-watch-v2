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
import faqs from "../constants/faqContents";
import markdownStyles from "../styles/markdownStyles";

const Faq = () => {
  return (
    <Accordion allowMultiple defaultIndex={undefined} w="100%" mt="30px">
      {faqs.map((faq) => (
        <AccordionItem key={faq.title} py="10px" borderColor="#6d6d6d">
          {({ isExpanded }) => (
            <Box>
              <AccordionButton>
                {isExpanded ? (
                  <AiOutlineDown color="#fff" />
                ) : (
                  <AiOutlineRight color="#fff" />
                )}
                <Flex ml="20px">
                  <Text fontWeight="bold" color="#fff" textAlign="left">
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
