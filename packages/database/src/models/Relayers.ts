// TODO:
// Run a script to populate the database with these entries
// This will fetch the data from the etherscan end-point
// Also have a hardcoded config we can update to use in the population

import { getModelForClass, prop } from "@typegoose/typegoose";

export class Relayer {
  @prop({ required: true })
  public address!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ default: null })
  public isOfacCensoring!: boolean | null;
}

export const RelayerModel = getModelForClass(Relayer);
