import { BLOCK_NUMBER_OF_MERGE, DATE_OF_MERGE } from "consts";
import { differenceInSeconds, isBefore } from "date-fns";
import { getDefaultProvider } from "ethers";

/**
 * Return number of blocks in time period. If start date is before the merge, will return
 * number of blocks between the start of the merge and the end date
 * @param startDate Start date to calculate blocks from
 * @param endDate Last date to calculate blocks up to 
 * @returns
 */
export const getTotalBlocks = async (startDate: Date, endDate: Date) => {
  if (isBefore(startDate, DATE_OF_MERGE)) {
    return (
      (await getDefaultProvider().getBlockNumber()) - BLOCK_NUMBER_OF_MERGE
    );
  }
  return Math.floor(differenceInSeconds(endDate, startDate) / 12);
};
