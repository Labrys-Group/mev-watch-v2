export declare class Relayer {
    url: string;
    name: string;
    isOfacCensoring: boolean;
    /**
     * Sorting priority for returning relayers. Higher number is a higher priority
     */
    priority?: number;
}
export declare const RelayerModel: import("@typegoose/typegoose").ReturnModelType<typeof Relayer, import("@typegoose/typegoose/lib/types").BeAnObject>;
//# sourceMappingURL=Relayer.d.ts.map