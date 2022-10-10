import { Ref } from "@typegoose/typegoose";
import { Relayer } from "./Relayer";
export declare class BlockStats {
    relayer: Ref<Relayer>;
    slotNumber: number;
    feeRecipient: string;
    proposerPublicKey: string;
    builderPublicKey: string;
    gasUsed: number;
    value: string;
    ts: Date;
}
export declare const BlockStatsModel: import("@typegoose/typegoose").ReturnModelType<typeof BlockStats, import("@typegoose/typegoose/lib/types").BeAnObject>;
//# sourceMappingURL=BlockStats.d.ts.map