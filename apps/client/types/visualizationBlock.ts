import { BlockStats, Relayer } from "database";

export interface VisualizationBlock extends Omit<BlockStats, "relayer"> {
  relayer: Relayer;
}
