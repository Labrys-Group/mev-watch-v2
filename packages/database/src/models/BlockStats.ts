import { getModelForClass, prop } from "@typegoose/typegoose";

export class BlockStats {
  // This could've optionally been a ref to the Relayer class but it's likely we will have to retrospectively add relayers and that will then require parsing all the old data and updating records
  @prop({ required: true })
  public relayAddress!: string;

  @prop({ required: true, unique: true })
  public blockNumber!: number;

  @prop({ required: true })
  public gasUsed!: number;

  @prop({ required: true })
  // Using ts as a field name enables mongoDB to recognize this model as a time-series model
  public ts!: Date;
}

export const BlockStatsModel = getModelForClass(BlockStats);
