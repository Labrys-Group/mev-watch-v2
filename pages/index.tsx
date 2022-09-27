import axios from "axios";
import { RelayStats } from "../types/relays";
import { parse } from "node-html-parser";
import { isRelayerOfacCompliant } from "../config/ofacCensorship";
import { Stack, Text } from "@chakra-ui/react";
import { formatNumberForDisplay, parseStringToNumber } from "../helpers/parser";

type PageData =
  | { success: true; relayStats: RelayStats[] }
  | { success: false };

const Home = (props: PageData) => {
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
          <Text w={80}>{item.ofacCompliant ? "Snitch" : "King"}</Text>
        </Stack>
      ))}
    </Stack>
  );
};

export default Home;

export async function getServerSideProps(): Promise<{ props: PageData }> {
  const { data: mevBoostWebpage } = await axios.get(
    "https://www.mevboost.org/"
  );
  const root = parse(mevBoostWebpage);
  const rankingTable = root.querySelector(".ranking-table");

  // Any nodes without children can be ignored as we are after the table element which has multiple children
  const validNodes = rankingTable?.childNodes.filter(
    (node) => node.childNodes.length > 0
  );

  if (!validNodes) {
    // TODO: Sentry
    return {
      props: {
        success: false,
      },
    };
  }

  const relayStats: RelayStats[] = [];

  validNodes[0].childNodes.forEach((node) => {
    // We only want the text element nodes here because all other nodeType's seem to be irrelevant for the data we are after
    if (node.nodeType !== 1) return;

    // Skip the first element because it is a newline character (\n)
    const [, name, numBlocks, totalValueETH, avgBlockValue] =
      node.childNodes.map((childNode) => childNode.textContent);

    if (!name || !numBlocks || !totalValueETH || !avgBlockValue) {
      // TODO: sentry

      return;
    }

    // This checks if the current row is for column titles
    if (name === "Relay") return;

    const ofacCompliant = isRelayerOfacCompliant(name);

    // This means our ofac compliance config is missing the entry for this relayer name
    if (ofacCompliant === null) {
      // TODO: Sentry

      return;
    }

    relayStats.push({
      name,
      ofacCompliant,
      avgBlockValue: parseStringToNumber(avgBlockValue),
      numBlocks: parseStringToNumber(numBlocks),
      totalValueETH: parseStringToNumber(totalValueETH),
    });
  });

  console.log(relayStats);

  return {
    props: { success: true, relayStats },
  };
}
