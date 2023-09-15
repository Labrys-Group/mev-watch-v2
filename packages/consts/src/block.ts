export const BLOCK_NUMBER_OF_MERGE = 15537394;
export const SLOT_NUMBER_OF_MERGE = 4700013;

export const DATE_OF_MERGE = new Date("Sep-15-2022 06:42:59 AM UTC");

/**
 * The current date but set to the hour/minute/second/millis time of the merge
 * This is used to ensure that the aggregation job runs at the same time every day
 */
export const timeOfMerge = () => {
  const today = new Date();
  const mergeDate = new Date(DATE_OF_MERGE);

  // Set the time components (hours, minutes, seconds) of the newDate to match today's date
  today.setHours(mergeDate.getHours());
  today.setMinutes(mergeDate.getMinutes());
  today.setSeconds(mergeDate.getSeconds());
  today.setMilliseconds(mergeDate.getMilliseconds());

  return today;
};
