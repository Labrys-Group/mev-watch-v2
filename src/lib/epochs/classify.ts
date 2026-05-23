import { classifyRelay } from "@/config/relays";

/** The censorship category of a single slot. */
export type SlotCategory = "censoring" | "neutral" | "nonboost";

/**
 * Classify a slot from the set of relays that delivered its block.
 *
 * "Censoring path wins": if any censoring relay was in the delivery set the
 * slot is censoring; a slot delivered only by neutral or unknown-posture
 * relays is neutral; a slot with no relay delivery is nonboost.
 */
export function classifySlot(relayIds: string[]): SlotCategory {
  if (relayIds.length === 0) return "nonboost";
  for (const id of relayIds) {
    if (classifyRelay(id).posture === "censoring") return "censoring";
  }
  return "neutral";
}
