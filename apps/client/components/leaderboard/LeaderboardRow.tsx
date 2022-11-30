import { chakra, HStack, Td, Image, Text, Tr } from "@chakra-ui/react";
import { unknownEntityLogo } from "consts";
import { ILeaderboardEntity } from "../../types";

interface ILeaderboardRow {
  rank: string;
  entity: ILeaderboardEntity;
}

export const LeaderboardRow = ({
  rank,
  entity: { entityName, entityLogo, totalBlocks, censoredBlocks, censorshipPercentage },
}: ILeaderboardRow) => {
  return (
    <Tr>
      <Cell color="gray.600">{rank}</Cell>
      <Cell>
        <HStack>
          <EntityImage src={entityLogo ?? unknownEntityLogo} />
          <EntityName>{entityName}</EntityName>
        </HStack>
      </Cell>
      <Cell>{totalBlocks.toLocaleString()}</Cell>
      <CensoredCell color={censoredBlocks > 0 ? "brightRed.500" : "brightGreen.500"}>{`${censoredBlocks.toLocaleString()}`}</CensoredCell>
      <CensoredCell color={censoredBlocks > 0 ? "brightRed.500" : "brightGreen.500"}>{`${censorshipPercentage.toFixed(0)}%`}</CensoredCell>
    </Tr>
  );
};

const EntityName = chakra(Text, {
  baseStyle: {
    maxW: "150px",
    fontSize: "0.9rem",
    textOverflow: "ellipsis"
  }
})

const EntityImage = chakra(Image, {
  baseStyle: {
    borderRadius: "25px",
    boxSize: "30px",
    mr: "5px",
  },
});

const Cell = chakra(Td, {
  baseStyle: {
    color: "gray.100",
    pl: "5px",
    border: "none",
  },
});

const CensoredCell = chakra(Cell, {
  baseStyle: {
    w: "90px"
  },
});
