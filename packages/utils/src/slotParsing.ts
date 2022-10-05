import { DATE_OF_MERGE, SLOT_NUMBER_OF_MERGE } from "consts";
import { addSeconds, differenceInSeconds } from "date-fns";

export const getSlotNumberFromDate = (date: Date) => {
  const timeDifference = differenceInSeconds(DATE_OF_MERGE, date);

  const slotDifference = Math.floor(timeDifference / 12);

  return slotDifference + SLOT_NUMBER_OF_MERGE;
};

export const getDateFromSlotNumber = (slotNumber: number) => {
  // Block time is always 12 seconds, we can safely use this
  const totalSecondsElapsed = (slotNumber - SLOT_NUMBER_OF_MERGE) * 12;

  return addSeconds(DATE_OF_MERGE, totalSecondsElapsed);
};
