import { getModelForClass, prop } from "@typegoose/typegoose";

export class Relayer {
  @prop({ required: true, unique: true })
  public url!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ default: null })
  public isOfacCensoring!: boolean;
}

export const RelayerModel = getModelForClass(Relayer);
