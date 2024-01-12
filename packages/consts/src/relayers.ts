import { Relayer } from "database/dist/models";

export const RELAYERS: Relayer[] = [
  {
    url: "https://bloxroute.ethical.blxrbdn.com",
    name: "BloXroute Ethical",
    isOfacCensoring: false,
    disabled: true,
  },
  {
    url: "https://bloxroute.max-profit.blxrbdn.com",
    name: "BloXroute Max Profit (Non Censoring)",
    isOfacCensoring: false,
    disabled: true,
  },
  {
    url: "https://bloxroute.max-profit.blxrbdn.com",
    name: "BloXroute Max Profit (Censoring)",
    isOfacCensoring: true,
  },
  {
    url: "https://bloxroute.regulated.blxrbdn.com",
    name: "BloXroute Regulated",
    isOfacCensoring: true,
  },
  {
    url: "https://relay.edennetwork.io",
    name: "Eden Network",
    isOfacCensoring: true,
  },
  {
    url: "https://mainnet-relay.securerpc.com",
    name: "Manifold",
    isOfacCensoring: false,
  },
  {
    url: "https://boost-relay.flashbots.net",
    name: "Flashbots",
    isOfacCensoring: true,
  },
  {
    url: "https://builder-relay-mainnet.blocknative.com",
    name: "Blocknative",
    isOfacCensoring: true,
  },
  {
    url: "https://relayooor.wtf",
    name: "Relayooor",
    isOfacCensoring: false,
    disabled: true,
  },
  {
    url: "https://relay.ultrasound.money",
    name: "Ultra Sound Money",
    isOfacCensoring: false,
    priority: 1,
  },
  {
    url: "https://agnostic-relay.net",
    name: "Agnostic Boost",
    isOfacCensoring: false,
    priority: 2,
  },
  {
    url: "https://mainnet.aestus.live/",
    name: "Aestus",
    isOfacCensoring: false,
    priority: 3,
  },
  {
    url: "https://relay.wenmerge.com/",
    name: "Wenmerge",
    isOfacCensoring: false,
    priority: 4,
  },
];
