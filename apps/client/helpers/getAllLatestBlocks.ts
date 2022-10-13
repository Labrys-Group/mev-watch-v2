import { VisualizationBlock } from "../types";

const getAllLatestBlocks = (
  visualizationBlocks: VisualizationBlock[] | undefined,
  totalBlocks: number
) => {
  if (!visualizationBlocks || visualizationBlocks.length === 0) return [];

  const latestBlock = visualizationBlocks[0].slotNumber;
  const allBlocks: VisualizationBlock[] = [];

  for (let i = 0; i < totalBlocks; i++) {
    const blockIndex = visualizationBlocks.findIndex(
      (block) => latestBlock - block.slotNumber - i === 0
    );

    const block =
      blockIndex !== -1
        ? visualizationBlocks[blockIndex]
        : {
            slotNumber: latestBlock - i,
            relayer: {
              url: "",
              name: "Non-MEV block",
              isOfacCensoring: false,
            },
            feeRecipient: "",
            proposerPublicKey: "",
            builderPublicKey: "",
            gasUsed: 0,
            value: "",
            ts: new Date(),
          };

    allBlocks.push(block);
  }
  return allBlocks;
};

export default getAllLatestBlocks;
