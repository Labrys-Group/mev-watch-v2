import { differenceInSeconds } from "date-fns";
import { DATE_OF_MERGE, SLOT_NUMBER_OF_MERGE } from "consts";

export const getSlotNumberFromDate = (date: Date) => {
  const timeDifference = differenceInSeconds(DATE_OF_MERGE, date);

  const slotDifference = Math.floor(timeDifference / 12);

  return slotDifference + SLOT_NUMBER_OF_MERGE;
};
