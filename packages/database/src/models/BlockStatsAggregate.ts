/* eslint-disable max-classes-per-file */
import { getModelForClass, prop, Ref } from "@typegoose/typegoose";

import { Relayer } from "./Relayer";

export class RelayStat {
  @prop({ required: true, ref: () => Relayer })
  public relayer!: Ref<Relayer>;

  @prop({ required: true })
  public relayerName!: string;

  @prop({ default: null })
  public isOfacCensoring!: boolean;

  @prop({ require: true })
  public blocks!: number;
}

export class StatsAggregate {
  @prop({ required: true })
  public stats!: RelayStat[];

  @prop({ required: true })
  public startDate!: Date;

  @prop({ required: true, unique: true })
  public ts!: Date;
}

export const StatsAggregateModel = getModelForClass(StatsAggregate);
