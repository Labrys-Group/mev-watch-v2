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
import { useContext, useMemo, useState } from "react";

import { formatDistance, sub } from "date-fns";
import BlockLabel from "./BlockLabel";
import { useQuery } from "react-query";
import axios from "axios";
import { GetLatestBlocksResponse } from "../../pages/api/getLatestBlocks";
import BlockTile from "./BlockTile";
import getAllLatestBlocks from "../../helpers/getAllLatestBlocks";
import { StatsContext } from "../../providers/StatsProvider";

const maxBlocks = 100;

const BlockVisualization = () => {
  const { includeAllBlocks, AllBlocksToggle } = useContext(StatsContext);

  const [time, setTime] = useState<Date>(new Date());

  const blocksPerRow = useBreakpointValue({ base: 10, md: 20 });
  // fetch the latest blocks from MongoDb
  const {
    data: latestBlocks,
    refetch,
    isLoading,
  } = useQuery(
    ["latestBlocks"],
    async () => {
      const response = await axios.post<GetLatestBlocksResponse>(
        "api/getLatestBlocks",
        {
          limit: maxBlocks,
        }
      );

      return response.data;
    },
    { refetchInterval: 20000 }
  );

  // useMemo to return blocks to avoid data flashing
  const visualizationBlocks = latestBlocks?.visualizationBlocks;

  const getBlocks = useMemo(() => {
    if (isLoading) return;

    const blocks = getAllLatestBlocks(
      visualizationBlocks?.reverse(),
      maxBlocks,
      includeAllBlocks
    );

    setTime(
      includeAllBlocks
        ? sub(new Date(), { minutes: 20 })
        : new Date(blocks[blocks.length - 1].ts)
    );

    return blocks.map((block) => (
      <BlockTile
        key={block.slotNumber}
        block={block}
        blocksPerRow={blocksPerRow ?? 20}
      />
    ));
  }, [visualizationBlocks, includeAllBlocks]);

  return (
    <DefaultContainer>
      <DefaultTitle>
        OFAC Compliant Block Visualisation - Last 100 blocks
        <SpanText as="span">{`(${formatDistance(new Date(), time)})`}</SpanText>
      </DefaultTitle>
      <HStack m="20px auto">
        <BlockLabel color="brightRed.500" label="Enforcing OFAC Censorship" />
        <BlockLabel
          color="brightGreen.500"
          label="Not Enforcing OFAC Censorship"
        />
        {includeAllBlocks && (
          <BlockLabel color="#CBCBCB" label="Non-MEV-Boost" />
        )}
      </HStack>

      {isLoading ? (
        <Flex>
          <DefaultSpinner minH="240px" />
        </Flex>
      ) : (
        <SimpleGrid
          columns={blocksPerRow}
          w="100%"
          spacingY="10px"
          spacingX="1px"
          my="20px"
        >
          {getBlocks}
        </SimpleGrid>
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
