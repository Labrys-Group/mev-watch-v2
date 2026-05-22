/** Beacon-chain time math for Ethereum mainnet. Pure functions, no I/O. */

/** Mainnet beacon-chain genesis, Unix seconds (2020-12-01 12:00:23 UTC). */
export const GENESIS_TIME = 1606824023;
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

/** The head slot for a given moment (default: now). */
export function currentSlot(now: number = Date.now()): number {
  return Math.floor(
    (Math.floor(now / 1000) - GENESIS_TIME) / SECONDS_PER_SLOT,
  );
}

/** The epoch a slot belongs to. */
export function epochOf(slot: number): number {
  return Math.floor(slot / SLOTS_PER_EPOCH);
}

/** The inclusive [first, last] slot range of an epoch. */
export function epochSlotRange(epoch: number): { first: number; last: number } {
  const first = epoch * SLOTS_PER_EPOCH;
  return { first, last: first + SLOTS_PER_EPOCH - 1 };
}
