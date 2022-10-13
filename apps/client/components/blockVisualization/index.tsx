import {
  Text,
  SimpleGrid,
  chakra,
  HStack,
  useBreakpointValue,
  Box,
  Spacer,
  Stack,
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
import { IoWarning } from "react-icons/io5";
import { sumBy } from "lodash";
import { MevWatchText } from "../MevWatchText";

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

  const compliancePercentage = useMemo(() => {
    return includeAllBlocks
      ? sumBy(getAllLatestBlocks(latestBlocks, maxBlocks), (b) =>
          b.relayer.isOfacCensoring ? 1 : 0
        ) : sumBy(latestBlocks, (b) =>
        b.relayer.isOfacCensoring ? 1 : 0
      );
  }, [latestBlocks, includeAllBlocks]);

  // fetch the latestBlocks
  useEffect(() => {
    getLatestBlocks();
    const getLatestBlocksInterval = setInterval(getLatestBlocks, 20000);
    return () => clearInterval(getLatestBlocksInterval);
  }, []);

  // useMemo to return blocks to avoid data flashing
  const getBlocks = useMemo(() => {
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
      <MevWatchText />
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

      <Stack
        direction={{ base: "column", md: "row" }}
        justifyContent="right"
        p="0px 0px 5px"
        mx="15px"
      >
        <Box w={{ base: "0px", md: "200px" }} /> <Spacer />
        <HStack justify="center" mt="20px" mb="10px" h="20px">
          {latestBlocks && (
            <>
              <IoWarning color="#ff0" size={24} />
              <PercentBlocksText>
                {`${compliancePercentage}${
                  includeAllBlocks
                    ? " / 100 blocks enforcing OFAC compliance"
                    : " / 100 relay blocks enforcing OFAC compliance"
                }`}
              </PercentBlocksText>
            </>
          )}
        </HStack>
        <Spacer />
        {AllBlocksToggle}
      </Stack>
    </DefaultContainer>
  );
};

export default BlockVisualization;

const PercentBlocksText = chakra(Text, {
  baseStyle: {
    textAlign: "center",
    color: "white",
  },
});

const SpanText = chakra(Text, {
  baseStyle: {
    color: "gray",
    fontSize: "0.8rem",
    marginLeft: "20px",
  },
});
