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
import { useQuery } from "react-query";
import axios from "axios";
import { GetLatestBlocksResponse } from "../../pages/api/getLatestBlocks";

const BlockVisualization = () => {
  const [time, setTime] = useState<Date>(new Date());
  const [includeAllBlocks, setIncludeAllBlocks] = useBoolean(false);

  const { data: latestBlocks } = useQuery(["latestBlocks"], () =>
    axios.post<GetLatestBlocksResponse>("api/getLatestBlocks", { limit: 100 })
  );

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
        {latestBlocks &&
          latestBlocks.data.visualizationBlocks.map((block) => (
            <BlockTile
              key={block.slotNumber}
              bg={
                block.relayer.isOfacCensoring
                  ? "brightRed.600"
                  : "brightGreen.600"
              }
            >
              <Text
                color={block.relayer.isOfacCensoring ? "white" : "black"}
                fontSize="0.7rem"
              >{`#${block.slotNumber.toString().slice(-3)}`}</Text>
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
