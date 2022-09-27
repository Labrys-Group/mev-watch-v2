const ofacCensorshipLookup: Record<string, boolean> = {
  Flashbots: true,
  "BloXroute Max Profit": false,
  "BloXroute Ethical": true,
  Blocknative: true,
  "BloXroute Regulated": true,
  Manifold: true,
  Eden: true,
};

/**
 * Simple wrapper to return whether the relayer is ofac compliant, returning null for missing values to simplify error handling
 */
export const isRelayerOfacCompliant = (relayName: string) => {
  const lookupValue = ofacCensorshipLookup[relayName];

  if (lookupValue === undefined) return null;

  return lookupValue;
};
