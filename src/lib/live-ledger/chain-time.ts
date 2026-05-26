export const GENESIS_TIME = 1_606_824_023;
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

export function currentSlot(now = Date.now()): number {
  return Math.max(
    0,
    Math.floor((Math.floor(now / 1000) - GENESIS_TIME) / SECONDS_PER_SLOT),
  );
}

export function epochOf(slot: number): number {
  return Math.floor(slot / SLOTS_PER_EPOCH);
}

export function epochSlotRange(epoch: number): { first: number; last: number } {
  const first = epoch * SLOTS_PER_EPOCH;
  return { first, last: first + SLOTS_PER_EPOCH - 1 };
}
