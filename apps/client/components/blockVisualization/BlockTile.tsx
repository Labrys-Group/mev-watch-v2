import { Flex, Text, Tooltip, chakra } from "@chakra-ui/react";
import { VisualizationBlock } from "../../types";

interface BlockTileProps {
  block: VisualizationBlock;
}

const getTileBgColor = (block: VisualizationBlock): string => {
  if (block.relayer.name !== "Non-MEV block") {
    if (block.relayer.isOfacCensoring) {
      return "brightRed.600";
    }
    return "brightGreen.600";
  }
  return "gray";
};

const BlockTile = (props: BlockTileProps) => {
  const { block } = props;

  return (
    <Tooltip
      label={`#${block.slotNumber}`}
      hasArrow
      placement="top"
      bg="#202020c7"
    >
      <BlockTileContainer bg={getTileBgColor(block)}>
        <Text
          color={block.relayer.isOfacCensoring ? "white" : "black"}
          fontSize="0.7rem"
        >{`#${block.slotNumber.toString().slice(-3)}`}</Text>
      </BlockTileContainer>
    </Tooltip>
  );
};

export default BlockTile;

const BlockTileContainer = chakra(Flex, {
  baseStyle: {
    width: "35px",
    height: "35px",
    padding: "10px",
    margin: "8px",
    borderRadius: "5px",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
});
