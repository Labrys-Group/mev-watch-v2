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
import { useEffect, useMemo, useState } from "react";

import { formatDistance, sub } from "date-fns";
import BlockLabel from "./BlockLabel";
import { useQuery } from "react-query";
import axios from "axios";
import { GetLatestBlocksResponse } from "../../pages/api/getLatestBlocks";
import BlockTile from "./BlockTile";
import { ethers, providers } from "ethers";
import getAllLatestBlocks from "../../helpers/getAllLatestBlocks";

const maxBlocks = 100;

const BlockVisualization = () => {
  const [time, setTime] = useState<Date>(new Date());
  const [includeAllBlocks, setIncludeAllBlocks] = useBoolean(false);
  const [provider, setProvider] = useState<providers.Provider>();

  // fetch the latest blocks from MongoDb
  const {
    data: latestBlocks,
    refetch,
    isLoading,
  } = useQuery(["latestBlocks"], () =>
    axios.post<GetLatestBlocksResponse>("api/getLatestBlocks", {
      limit: maxBlocks,
    })
  );

  // create a provider to read mainnet
  useEffect(() => {
    if (!window.ethereum) return;
    const newProvider = ethers.getDefaultProvider();
    setProvider(newProvider);
  }, []);

  // TODO: uncomment this to run
  // refetch latest blocks on every new block in mainnet
  provider?.on("block", refetch);

  // useMemo to return blocks to avoid data flashing
  const getBlocks = useMemo(() => {
    if (!latestBlocks) return;

    const blocks = getAllLatestBlocks(
      latestBlocks.data.visualizationBlocks.reverse(),
      maxBlocks,
      includeAllBlocks
    );

    setTime(
      includeAllBlocks
        ? sub(new Date(), { minutes: 20 })
        : new Date(blocks[blocks.length - 1].ts)
    );

    return blocks.map((block) => (
      <BlockTile key={block.slotNumber} block={block} />
    ));
  }, [latestBlocks, includeAllBlocks]);

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
        {includeAllBlocks && <BlockLabel color="gray" label="Non-MEV-Boost" />}
      </HStack>

      {!isLoading && (
        <SimpleGrid
          columns={20}
          w="100%"
          spacingY="3px"
          spacingX="5px"
          my="20px"
        >
          {getBlocks}
        </SimpleGrid>
      )}

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
