import { DATE_OF_MERGE } from "consts";
import { differenceInSeconds, isBefore } from "date-fns";

/**
 * Return number of blocks in time period. If start date is before the merge, will return
 * number of blocks between the start of the merge and the end date
 * @param startDate Start date to calculate blocks from
 * @param endDate Last date to calculate blocks up to
 * @returns
 */
export const getTotalBlocks = async (startDate: Date, endDate: Date) => {
  const _startDate = isBefore(startDate, DATE_OF_MERGE)
    ? DATE_OF_MERGE
    : startDate;

  return Math.floor(differenceInSeconds(endDate, _startDate) / 12);
};
