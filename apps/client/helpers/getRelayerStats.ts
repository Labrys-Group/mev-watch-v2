import axios from "axios";
import parse from "node-html-parser";
import { isRelayerOfacCompliant } from "../config/ofacCensorship";
import { GenericResponse } from "../types/relays";
import { WebScrapedRelayStats } from "../types/relays";
import { parseStringToNumber } from "./parser";

/**
 * This method scrapes the mevboost.org webpage to extract the relayer stats.This mostly utilizes node-html-parser to parse the webpage and extract the relevant data
 * @returns The parsed data or an invalid response
 */
export const getRelayerStats = async (): Promise<
  GenericResponse<WebScrapedRelayStats[]>
> => {
  const { data: mevBoostWebpage } = await axios.get(
    "https://www.mevboost.org/"
  );
  const root = parse(mevBoostWebpage);
  // The class selector for the ranking table containing the data we require
  const rankingTable = root.querySelector(".ranking-table");

  // Any nodes without children can be ignored as we are after the table element which has multiple children
  const validNodes = rankingTable?.childNodes.filter(
    (node) => node.childNodes.length > 0
  );

  if (!validNodes) {
    // TODO: Sentry
    return {
      success: false,
    };
  }

  const relayStats: WebScrapedRelayStats[] = [];

  validNodes[0].childNodes.forEach((node) => {
    // We only want the text element nodes here because all other nodeType's seem to be irrelevant for the data we are after
    if (node.nodeType !== 1) return;

    // Skip the first element because it is a newline character (\n)
    const [, name, numBlocks, totalValueETH, avgBlockValue] =
      node.childNodes.map((childNode) => childNode.textContent);

    // This indicates a malformed row
    if (!name || !numBlocks || !totalValueETH || !avgBlockValue) {
      // TODO: sentry

      return;
    }

    // This checks if the current row is actually the title row
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

  return {
    success: true,
    response: relayStats,
  };
};
