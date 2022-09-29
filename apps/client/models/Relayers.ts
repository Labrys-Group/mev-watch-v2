// TODO:
// Run a script to populate the database with these entries
// This will fetch the data from the etherscan end-point
// Also have a hardcoded config we can update to use in the population

export interface Relayer {
  address: string;
  // If we don't have a name for the relayer
  name: string | null;
  // If we don't have a lookup value for this
  isOfacCensoring: boolean | null;
}
