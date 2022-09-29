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
