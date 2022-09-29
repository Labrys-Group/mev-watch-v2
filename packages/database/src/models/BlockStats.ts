import { getModelForClass, prop } from "@typegoose/typegoose";

export class BlockStats {
  @prop({ required: true })
  // TODO: Petition to change to a ref
  public relayAddress!: string;

  @prop({ required: true })
  public blockNumber!: number;

  // TODO: Block fees??

  @prop({ required: true })
  public gasUsed!: number;

  @prop({ default: Date.now() })
  // Using ts as a field name enables mongoDB to recognize this model as a time-series model
  public ts!: Date;
}

export const BlockStatsModel = getModelForClass(BlockStats);
