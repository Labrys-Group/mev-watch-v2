import {
  Flex,
  Text,
  SimpleGrid,
  chakra,
  HStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import {
  DefaultContainer,
  DefaultSpinner,
  DefaultTitle,
} from "../../styles/StyledComponents";
import { useContext, useEffect, useMemo, useState } from "react";

import { formatDistance, sub } from "date-fns";
import BlockLabel from "./BlockLabel";
import axios from "axios";
import { GetLatestBlocksResponse } from "../../pages/api/getLatestBlocks";
import BlockTile from "./BlockTile";
import getAllLatestBlocks from "../../helpers/getAllLatestBlocks";
import { StatsContext } from "../../providers/StatsProvider";
import { VisualizationBlock } from "../../types";

// number of blocks displaying in the Block visualization table
const maxBlocks = 100;

const BlockVisualization = () => {
  const { includeAllBlocks, AllBlocksToggle } = useContext(StatsContext);

  const [latestBlocks, setLatestBlocks] = useState<VisualizationBlock[]>();

  const [time, setTime] = useState<Date>(new Date());

  const blocksPerRow = useBreakpointValue({ base: 10, md: 20 });

  const getLatestBlocks = async () => {
    try {
      const response = await axios.post<GetLatestBlocksResponse>(
        "api/getLatestBlocks",
        { limit: maxBlocks }
      );
      setLatestBlocks(response.data.visualizationBlocks);
    } catch (err) {
      console.error(err);
    }
  };

  // fetch the latestBlocks
  useEffect(() => {
    getLatestBlocks();
    const getLatestBlocksInterval = setInterval(getLatestBlocks, 20000);
    return () => clearInterval(getLatestBlocksInterval);
  }, []);

  // useMemo to return blocks to avoid data flashing
  const getBlocks = useMemo(() => {
    if (!latestBlocks) return;
    if (!latestBlocks) return;

    const visualizationBlocks = !includeAllBlocks
      ? latestBlocks
      : getAllLatestBlocks(latestBlocks, maxBlocks);

    setTime(
      includeAllBlocks
        ? sub(new Date(), { minutes: 20 })
        : new Date(visualizationBlocks[visualizationBlocks.length - 1].ts)
    );

    return visualizationBlocks.map((block) => (
      <BlockTile
        key={block.slotNumber}
        block={block}
        blocksPerRow={blocksPerRow ?? 20}
      />
    ));
  }, [latestBlocks, includeAllBlocks]);

  return (
    <DefaultContainer>
      <DefaultTitle>
        OFAC Compliant Block Visualisation - Last 100 blocks
        <SpanText as="span">{`(${formatDistance(new Date(), time)})`}</SpanText>
      </DefaultTitle>

      {!latestBlocks ? (
        <DefaultSpinner minH="240px" />
      ) : (
        <>
          <HStack m="20px auto">
            <BlockLabel
              color="brightRed.500"
              label="Enforcing OFAC Censorship"
            />
            <BlockLabel
              color="brightGreen.500"
              label="Not Enforcing OFAC Censorship"
            />
            {includeAllBlocks && (
              <BlockLabel color="#CBCBCB" label="Non-MEV-Boost" />
            )}
          </HStack>
          <SimpleGrid
            columns={blocksPerRow}
            w="100%"
            spacingY="10px"
            spacingX="1px"
            my="20px"
          >
            {getBlocks}
          </SimpleGrid>
        </>
      )}

      <Flex justify="flex-end" mx="20px">
        {AllBlocksToggle}
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
