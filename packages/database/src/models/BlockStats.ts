import { getModelForClass, prop, Ref } from "@typegoose/typegoose";

import { Relayer } from "./Relayer";

export class BlockStats {
  @prop({ required: true, ref: () => Relayer })
  public relayer!: Ref<Relayer>;

  @prop({ required: true, unique: true })
  public slotNumber!: number;

  @prop({ required: true })
  public feeRecipient!: string;

  @prop({ required: true })
  public proposerPublicKey!: string;

  @prop({ required: true })
  public builderPublicKey!: string;

  @prop({ required: true })
  public gasUsed!: number;

  @prop({ required: true })
  public value!: string;

  @prop({ required: true })
  // Using ts as a field name enables mongoDB to recognize this model as a time-series model
  public ts!: Date;
}

export const BlockStatsModel = getModelForClass(BlockStats);
