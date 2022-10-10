/* eslint-disable max-classes-per-file */
import { getModelForClass, prop, Ref } from "@typegoose/typegoose";

import { Relayer } from "./Relayer";

export class RelayStat {
  @prop({ required: true, ref: () => Relayer })
  public relayer!: Ref<Relayer>;

  @prop({ require: true })
  public relayerName!: string;

  @prop({ default: null })
  public isOfacCensoring!: boolean;

  @prop({ require: true })
  public blocks!: number;
}

export class StatsAggregate {
  @prop({ required: true })
  public stats!: RelayStat[];

  /**
   * The starting time for the aggregation time period
   */
  @prop({ required: true })
  public startTime!: Date;

  /**
   * The end time at which the stats aggregation has occurred
   */
  @prop({ required: true })
  public ts!: Date;
}

export const StatsAggregateModel = getModelForClass(StatsAggregate);
