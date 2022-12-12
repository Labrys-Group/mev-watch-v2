// TODO: What are these actual values
const ofacCensorshipLookup: Record<string, boolean> = {
  Flashbots: true,
  "BloXroute Max Profit": false,
  "BloXroute Ethical": false,
  Blocknative: true,
  "BloXroute Regulated": true,
  Manifold: false,
  Eden: true,
  Relayooor: false,
  "Ultra Sound Money": false,
  "Agnostic Boost": false,
  Aestus: false,
};

/**
 * Simple wrapper to return whether the relayer is ofac compliant, returning null for missing values to simplify error handling
 */
export const isRelayerOfacCompliant = (relayName: string) => {
  const lookupValue = ofacCensorshipLookup[relayName];

  if (lookupValue === undefined) return null;

  return lookupValue;
};
