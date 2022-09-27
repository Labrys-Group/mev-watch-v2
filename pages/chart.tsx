import { Stack, Text } from "@chakra-ui/react";
import { formatNumberForDisplay, parseStringToNumber } from "../helpers/parser";
import { RelayerResponseData } from "../types/relays";
import { getRelayerStats } from "../helpers/getRelayerStats";

const chart = (props: RelayerResponseData) => {
  if (!props.success) return <>Error Display</>;

  return (
    <Stack flexDirection={"column"}>
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

      {props.relayStats.map((item) => (
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

export default chart;

export async function getServerSideProps(): Promise<{
  props: RelayerResponseData;
}> {
  const relayerStats = await getRelayerStats();

  return {
    props: relayerStats,
  };
}
