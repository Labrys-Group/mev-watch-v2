import {
  Flex,
  Text,
  Tooltip,
  chakra,
  Center,
  AspectRatio,
} from "@chakra-ui/react";
import { VisualizationBlock } from "../../types";

interface BlockTileProps {
  block: VisualizationBlock;
  blocksPerRow: number;
}

const getTileBgColor = (block: VisualizationBlock): string => {
  if (block.relayer.name !== "Non-MEV block") {
    if (block.relayer.isOfacCensoring) {
      return "brightRed.500";
    }
    return "brightGreen.500";
  }
  return "#CBCBCB";
};

const BlockTile = (props: BlockTileProps) => {
  const { block, blocksPerRow } = props;

  return (
    <Tooltip
      label={`Slot #${block.slotNumber}`}
      hasArrow
      placement="top"
      bg="#202020c7"
    >
      <BlockTileContainer
        ratio={1}
        maxW="32px"
        bg={getTileBgColor(block)}
        onClick={() =>
          window.open(`https://beaconcha.in/slot/${block.slotNumber}`)
        }
      >
        <Text
          color={block.relayer.isOfacCensoring ? "white" : "black"}
          fontSize="0.65rem"
        >{`#${block.slotNumber.toString().slice(-3)}`}</Text>
      </BlockTileContainer>
    </Tooltip>
  );
};

export default BlockTile;

const BlockTileContainer = chakra(AspectRatio, {
  baseStyle: {
    // minWidth: "20px",
    // maxWidth: "35px",
    // width: "100%",
    // minHeight: "20px",
    // maxHeight: "35px",
    // boxSize: "35px",
    // height: "100%",
    // padding: "5px",
    // margin: "2px",
    borderRadius: "3px",
    cursor: "pointer",
  },
});
