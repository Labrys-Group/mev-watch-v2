import { getModelForClass, prop } from "@typegoose/typegoose";

// ! This is currently unused, but can be used in future if the relayers are to be saved to a database. That will allow adding new relayers without redeploying the backend
export class Relayer {
  @prop({ required: true, unique: true })
  public url!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ default: null })
  public isOfacCensoring!: boolean;
}

export const RelayerModel = getModelForClass(Relayer);
