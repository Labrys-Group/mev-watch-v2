import { ILeaderboardEntity } from "../types";

export enum ISortingOption {
  CensoredBlocks,
  CensoredPercentage,
}

const sort: Record<
  ISortingOption,
  (data: ILeaderboardEntity[]) => ILeaderboardEntity[]
> = {
  [ISortingOption.CensoredBlocks]: (data) => data,
  [ISortingOption.CensoredPercentage]: (data) => {
    const sorted = [...data];

    return sorted.sort(
      (a, b) => b.censorshipPercentage - a.censorshipPercentage
    );
  },
};

/**
 * Return leaderboard sorted by option
 *
 * @param leaderboard
 * @param sortingOption
 * @returns
 */
export const sortLeaderboard = (
  leaderboard: ILeaderboardEntity[],
  sortingOption: ISortingOption
) => {
  return sort[sortingOption](leaderboard);
};
