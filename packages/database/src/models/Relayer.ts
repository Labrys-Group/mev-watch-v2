import { getModelForClass, prop } from "@typegoose/typegoose";

export class Relayer {
  @prop({ required: true })
  public url!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ default: null })
  public isOfacCensoring!: boolean;

  /**
   * Sorting priority for returning relayers. Higher number is a higher priority
   */
  @prop({ required: false })
  public priority?: number;

  @prop({ required: false })
  public disabled?: boolean;
}

export const RelayerModel = getModelForClass(Relayer);
