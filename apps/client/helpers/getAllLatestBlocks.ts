import { VisualizationBlock } from "../types";

const getAllLatestBlocks = (
  mevBlocks: VisualizationBlock[] | undefined,
  totalBlocks: number,
  includeAll: boolean
) => {
  if (!mevBlocks) return [];
  if (!includeAll) return mevBlocks;

  const latestBlock = mevBlocks[0].slotNumber;
  const allBlocks: VisualizationBlock[] = [];

  for (let i = 0; i < totalBlocks; i++) {
    const blockIndex = mevBlocks.findIndex(
      (block) => latestBlock - block.slotNumber - i === 0
    );

    const block =
      blockIndex !== -1
        ? mevBlocks[blockIndex]
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
  // console.log("OR", mevBlocks);
  // console.log("RE", allBlocks);
  return allBlocks;
};

export default getAllLatestBlocks;
