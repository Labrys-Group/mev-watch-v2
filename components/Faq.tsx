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

const markdownStyles = {
  h3: ({ node, ...props }: { node: any }) => <p style={{ margin: "10px 0"}} {...props} />,
  a: ({ node, ...props }: { node: any }) => (
    <a style={{ color: "#15bfe3", textDecoration: "underline" }} {...props} />
  ),
};

const faqs: { title: string; content: string }[] = [
  {
    title: "What is this metric?",
    content: `###  This metric tracks the percentage of blocks built by OFAC compliant mev-boost relays since the Merge (as a percentage of mev-boost proposed blocks or all blocks). 
### The Ethereum Merge that occurred on September 15, 2022, has enabled the rise of mev-boost due to the wider distribution of block proposers compared to a small set of miners in charge of block production under PoW. Mev-boost is a service that Ethereum POS Validators have the option to run to outsource their block production duties to the highest bidder, effectively increasing their APR. When setting up mev-boost, Validators add to their config which relays they would like to accept blocks from.    
### There are currently seven major mev-boost relays including Flashbots, BloXroute Max Profit, BloXroute Ethical, BloXroute Regulated, BlockNative, Manifold and Eden. Of the 7 available major relays only 3 do not censor according to OFAC compliance requirements. OFAC compliant relays will not include any transactions that interact with the Tornado Cash smart contract or other sanctioned wallet addresses as designated by OFAC.   
### Not all blocks built by OFAC compliant relays are censoring, however, all blocks built by OFAC compliant relays will censor when non-compliant transactions are broadcast to the network.`,
  },
  {
    title: "What can I do as a Validator?",
    content: `Consider not including any relays in your mev-boost configuration that censor transactions. Current major mev-boost relays that don’t censor include:  
    - [BloXroute Max Profit](https://0x8b5d2e73e2a3a55c6c87b8b6eb92e0149a125c852751db1422fa951e42a09b82c142c3ea98d0d9930b056a3bc9896b8f@bloxroute.max-profit.blxrbdn.com)  
    - [BloxRoute Ethical](https://0xad0a8bb54565c2211cee576363f3a347089d2f07cf72679d16911d740262694cadb62d7fd7483f27afd714ca0f1b9118@bloxroute.ethical.blxrbdn.com)  
    - [Manifold](https://0x98650451ba02064f7b000f5768cf0cf4d4e492317d82871bdc87ef841a0743f69f0f1eea11168503240ac35d101c9135@mainnet-relay.securerpc.com)  
    `,
  },
  {
    title: "How is OFAC compliance (censorship) status determined?",
    content: `You can find a list of available mev relays and their OFAC status [here](https://github.com/remyroy/ethstaker/blob/main/MEV-relay-list.md).  
    If you are a relay operator and believe your relay’s compliance with OFAC has been miscategorised, please reach out and we will update its OFAC compliance status.
      `,
  },
  {
    title: "Is Labrys aginst regulation?",
    content:
      "No. Regulation is inevitable as the crypto industry matures. All persons and entities within the United States, all U.S. incorporated entities and their foreign branches who operate Ethereum POS validators should seek their own advice on whether their validators must produce OFAC compliant blocks. However, ensuring that Ethereum remains credibly neutral on the global stage is important. All persons and entities operating validators outside of the U.S. should consider running non-censoring relays for the benefit of the network.",
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
                  {/* {faq.content} */}
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
