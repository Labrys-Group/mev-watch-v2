import { chakra, HStack, Td, Image, Text, Tr } from "@chakra-ui/react";

interface ILeaderboardEntity {
  entityName: string;
  entityLogo: string;
  totalBlocks: number;
  censoredBlocks: number;
}

interface ILeaderboardRow {
  rank: string;
  entity: ILeaderboardEntity;
}

export const LeaderboardRow = ({
  rank,
  entity: { entityName, entityLogo, totalBlocks, censoredBlocks },
}: ILeaderboardRow) => {
  const censorshipPercentage = Math.floor((100 * censoredBlocks) / totalBlocks);
  return (
    <Tr>
      <Cell color="gray.600">{rank}</Cell>
      <Cell>
        <HStack>
          <EntityImage src={entityLogo} />
          <Text>{entityName}</Text>
        </HStack>
      </Cell>
      <Cell>{totalBlocks.toLocaleString()}</Cell>
      <Cell>
        <HStack>
          <Text color="brightRed.500">{`${censoredBlocks.toLocaleString()}`}</Text>{" "}
          <Text fontSize="0.5rem">{`(${censorshipPercentage}%)`}</Text>{" "}
        </HStack>
      </Cell>
    </Tr>
  );
};

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
