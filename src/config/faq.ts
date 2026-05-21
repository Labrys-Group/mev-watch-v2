/**
 * FAQ items for the MEV Watch FAQ section.
 * Answers are accurate as of 2026 and reflect current relay landscape and methodology.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What is MEV-Boost?",
    a: "MEV-Boost is middleware that lets Ethereum validators outsource block construction to a competitive market of specialised builders, connected via relays. Builders compete to produce the most valuable block; the winning bid is relayed to the validator, who earns a larger share of MEV revenue than solo-building would yield.",
  },
  {
    q: 'What does "OFAC-censoring" mean?',
    a: "An OFAC-censoring relay refuses to propagate blocks containing transactions that touch US-sanctioned addresses — most famously Tornado Cash. Blocks built and delivered through such a relay will never include those transactions, regardless of fees offered.",
  },
  {
    q: "Why does censorship matter?",
    a: "Credible neutrality — the guarantee that Ethereum will include any valid, fee-paying transaction — is foundational to the network's social contract. When the majority of block flow routes through relays that all filter the same transactions, the network's permissionlessness erodes in practice even if it remains intact on paper.",
  },
  {
    q: "How is this measured?",
    a: "MEV Watch reads payload-delivery statistics from relayscan.io and reports the share of MEV-Boost relay payload deliveries attributable to censoring relays. Because a single block may be delivered by multiple relays, totals are counted per relay — this is a delivery-share ratio, not an exact block count. Each relay's censorship posture is an editorial classification maintained in this codebase.",
  },
  {
    q: "What should validators do?",
    a: "Configure mev-boost to connect only to neutral relays: Ultra Sound, Aestus, Agnostic Gnosis, and Titan all have strong track records of non-censorship. Remove OFAC-filtering relays such as Flashbots, bloXroute Max Profit, and bloXroute Regulated. The cost to you is zero; the benefit to Ethereum is a credibly neutral base layer.",
  },
  {
    q: "Is the data verifiable?",
    a: "Yes. Relay payload statistics are sourced from relayscan.io's public API, which is maintained by Flashbots and open to independent verification. The editorial classification of each relay's censorship posture, as well as the full measurement methodology, is documented on the methodology page and in the open-source repository.",
  },
];
