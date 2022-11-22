import {
  chakra,
  Table,
  TableContainer,
  Tbody,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { ILeaderboardEntity } from "../../types/leaderboard";
import { LeaderboardRow } from "./LeaderboardRow";

interface ILeaderboardTable {
  data: ILeaderboardEntity[];
}

export const LeaderboardTable = ({ data }: ILeaderboardTable) => {
  return (
    <TableContainer mt="20px" maxH="500px" overflowY="auto">
      <Table variant="simple">
        <Thead position="sticky" top={0} background="#0f0f0f">
          <Tr>
            <HeaderCell>Rank</HeaderCell>
            <HeaderCell>Staking Entity</HeaderCell>
            <HeaderCell>Total Blocks</HeaderCell>
            <HeaderCell>Censored</HeaderCell>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((_entity, index) => (
            <LeaderboardRow
              key={_entity.entityName}
              rank={`#${index + 1}`}
              entity={_entity}
            />
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

const HeaderCell = chakra(Th, {
  baseStyle: {
    color: "brightGreen.500",
    textAlign: "left",
    p: "5px",
    pb: "10px",
    borderBottom: "2px solid",
    borderColor: "gray.700",
  },
});
