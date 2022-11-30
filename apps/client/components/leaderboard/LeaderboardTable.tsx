import {
  chakra,
  VStack,
  Table,
  TableContainer,
  Tbody,
  Th,
  Thead,
  Tr,
  Text,
  HStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { IoMdArrowDropdown } from "react-icons/io";

import { ISortingOption, sortLeaderboard } from "../../helpers/sortLeaderboard";
import { ILeaderboardEntity } from "../../types/leaderboard";
import { LeaderboardRow } from "./LeaderboardRow";

interface ILeaderboardTable {
  data: ILeaderboardEntity[];
}

export const LeaderboardTable = ({ data }: ILeaderboardTable) => {
  const [sortingOption, setSortingOption] = useState<ISortingOption>(
    ISortingOption.CensoredPercentage
  );

  return (
    <StyledTableContainer css={hideScrollbar}>
      <Table variant="simple">
        <Thead position="sticky" top={0} background="#0f0f0f">
          <Tr>
            <HeaderCell>Rank</HeaderCell>
            <HeaderCell>Staking Entity</HeaderCell>
            <HeaderCell w="90px">Total</HeaderCell>
            <SortedHeaderCell
              textDecoration={
                sortingOption === ISortingOption.CensoredBlocks
                  ? "underline"
                  : "none"
              }
              onClick={() => setSortingOption(ISortingOption.CensoredBlocks)}
            >
              <HStack spacing={0}>
                <Text>Censored</Text>
                <IoMdArrowDropdown
                  size={20}
                  color={
                    sortingOption === ISortingOption.CensoredBlocks
                      ? "#00FFA7"
                      : "gray"
                  }
                />
              </HStack>
            </SortedHeaderCell>
            <SortedHeaderCell
              textDecoration={
                sortingOption === ISortingOption.CensoredPercentage
                  ? "underline"
                  : "none"
              }
              onClick={() =>
                setSortingOption(ISortingOption.CensoredPercentage)
              }
            >
              <HStack spacing={0}>
                <Text>% Censored</Text>
                <IoMdArrowDropdown
                  size={20}
                  color={
                    sortingOption === ISortingOption.CensoredPercentage
                      ? "#00FFA7"
                      : "gray"
                  }
                />
              </HStack>
            </SortedHeaderCell>
          </Tr>
        </Thead>
        <Tbody>
          {sortLeaderboard(data, sortingOption).map((_entity, index) => (
            <LeaderboardRow
              key={_entity.entityName}
              rank={`#${index + 1}`}
              entity={_entity}
            />
          ))}
        </Tbody>
      </Table>
    </StyledTableContainer>
  );
};

const hideScrollbar = {
  "&::-webkit-scrollbar": {
    display: "none",
  },

  "&::-webkit-scrollbar-thumb": {
    display: "none",
  },
};

const StyledTableContainer = chakra(TableContainer, {
  baseStyle: {
    mt: "20px",
    maxH: "500px",
    overflowY: "auto",
  },
});

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

const SortedHeaderCell = chakra(HeaderCell, {
  baseStyle: {
    cursor: "pointer",
    userSelect: "none",
    w: "90px",
  },
});
