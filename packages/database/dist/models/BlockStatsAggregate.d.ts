import { Ref } from "@typegoose/typegoose";
import { Relayer } from "./Relayer";
export declare class RelayStat {
    relayer: Ref<Relayer>;
    relayerName: string;
    isOfacCensoring: boolean;
    blocks: number;
}
export declare class StatsAggregate {
    stats: RelayStat[];
    startDate: Date;
    ts: Date;
}
export declare const StatsAggregateModel: import("@typegoose/typegoose").ReturnModelType<typeof StatsAggregate, import("@typegoose/typegoose/lib/types").BeAnObject>;
//# sourceMappingURL=BlockStatsAggregate.d.ts.map