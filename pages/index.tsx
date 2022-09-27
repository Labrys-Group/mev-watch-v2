import { Stack, Text } from "@chakra-ui/react";
import { formatNumberForDisplay } from "../helpers/parser";
import { RelayerResponseData } from "../types/relays";
import { getRelayerStats } from "../helpers/getRelayerStats";
import { BLOCK_NUMBER_OF_MERGE } from "../constants/common";
import { ProviderSingleton } from "../constants/provider";

const Home = (props: RelayerResponseData) => {
  if (!props.success) return <>Error Display</>;

  return (
    <Stack flexDirection={"column"}>
      <Stack>
        <Text>BLOCKS SINCE MERGE: {props.response.numBlocksSinceMerge}</Text>
      </Stack>
      {/* Table to demonstrate correctness, can be removed */}
      <Stack alignItems={"center"} flexDirection={"row"}>
        <Text w={250} fontWeight={"bold"}>
          Relay
        </Text>
        <Text w={80} fontWeight={"bold"}>
          # Blocks
        </Text>
        <Text w={80} fontWeight={"bold"}>
          Total Value (ETH)
        </Text>
        <Text w={80} fontWeight={"bold"}>
          Avg. Block Value
        </Text>
        <Text w={80} fontWeight={"bold"}>
          OFAC Compliant
        </Text>
      </Stack>

      {props.response.relayStats.map((item) => (
        <Stack alignItems={"center"} flexDirection={"row"} key={item.name}>
          <Text w={250}>{item.name}</Text>
          <Text w={80}>{formatNumberForDisplay(item.numBlocks)}</Text>
          <Text w={80}>{formatNumberForDisplay(item.totalValueETH)}</Text>
          <Text w={80}>{formatNumberForDisplay(item.avgBlockValue)}</Text>
          <Text w={80}>{item.ofacCompliant ? "Yes" : "No"}</Text>
        </Stack>
      ))}
    </Stack>
  );
};

export default Home;

export async function getServerSideProps(): Promise<{
  props: RelayerResponseData;
}> {
  const [relayStats, currentBlock] = await Promise.all([
    await getRelayerStats(),
    await ProviderSingleton.provider.getBlock("latest"),
  ]);

  if (!relayStats.success) {
    return {
      props: { success: false },
    };
  }

  return {
    props: {
      success: true,
      response: {
        relayStats: relayStats.response,
        numBlocksSinceMerge: currentBlock.number - BLOCK_NUMBER_OF_MERGE,
      },
    },
  };
}
