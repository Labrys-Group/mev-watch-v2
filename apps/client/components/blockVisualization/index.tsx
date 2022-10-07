import {
  Flex,
  Text,
  SimpleGrid,
  chakra,
  HStack,
  useBoolean,
} from "@chakra-ui/react";
import {
  DefaultContainer,
  DefaultSwitch,
  DefaultTitle,
} from "../../styles/StyledComponents";
import { useState } from "react";

import { formatDistance } from "date-fns";
import BlockLabel from "./BlockLabel";

const BlockVisualization = () => {
  const [time, setTime] = useState<Date>(new Date());
  const [includeAllBlocks, setIncludeAllBlocks] = useBoolean(false);

  const getBlocks = (size: number) => {
    const blocks: { censor: boolean; id: number }[] = [];

    for (let i = 0; i < size; i += 1) {
      blocks.push({
        censor: i % 2 === 0,
        id: i,
      });
    }
    return blocks;
  };
  return (
    <DefaultContainer>
      <DefaultTitle>
        OFAC Compliant Block Visualisation - Last 100 blocks
        <SpanText as="span">{`(${formatDistance(new Date(), time)})`}</SpanText>
      </DefaultTitle>
      <HStack m="20px 30px">
        <BlockLabel color="brightRed.600" label="Enforcing OFAC Censorship" />
        <BlockLabel
          color="brightGreen.600"
          label="Not Enforcing OFAC Censorship"
        />
        {includeAllBlocks && (
          <BlockLabel color="gray.500" label="Non-MEV-Boost" />
        )}
      </HStack>
      <SimpleGrid columns={20} w="100%" spacingY="3px" spacingX="5px" my="20px">
        {getBlocks(100).map((block) => (
          <BlockTile
            key={block.id}
            bg={block.censor ? "brightRed.600" : "brightGreen.600"}
          >
            <Text
              color={block.censor ? "white" : "black"}
              fontSize="0.9rem"
            >{`#${block.id}`}</Text>
          </BlockTile>
        ))}
      </SimpleGrid>
      <Flex justify="flex-end" mx="20px">
        <DefaultSwitch
          onChange={setIncludeAllBlocks.toggle}
          isChecked={includeAllBlocks}
          label="Include all Blocks"
        />
      </Flex>
    </DefaultContainer>
  );
};

export default BlockVisualization;

const SpanText = chakra(Text, {
  baseStyle: {
    color: "gray",
    fontSize: "0.8rem",
    marginLeft: "20px",
  },
});

const BlockTile = chakra(Flex, {
  baseStyle: {
    width: "35px",
    height: "35px",
    padding: "10px",
    margin: "8px",
    borderRadius: "5px",
    justifyContent: "center",
    alignItems: "center",
  },
});
