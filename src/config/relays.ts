import { z } from "zod";
import rawRelays from "../data/relays.json";

export type RelayPosture = "censoring" | "neutral" | "unknown";

const RelayPostureSchema = z.enum(["censoring", "neutral", "unknown"]);

const PriorPostureSchema = z.object({
  since: z.string(),
  posture: RelayPostureSchema,
});

const RelayRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  posture: RelayPostureSchema,
  active: z.boolean(),
  dataApiHost: z.string().optional(),
  priorPostures: z.array(PriorPostureSchema).optional(),
});

export interface PriorPosture {
  since: string;
  posture: RelayPosture;
}

export interface RelayClassification {
  id: string;
  name: string;
  posture: RelayPosture;
  priorPostures?: PriorPosture[];
}

export interface RelayInfo extends RelayClassification {
  dataApiHost: string;
}

type RelayRecord = z.infer<typeof RelayRecordSchema>;

const ALL_RELAY_RECORDS: RelayRecord[] = z.array(RelayRecordSchema).parse(rawRelays);

export const RELAYS: RelayInfo[] = ALL_RELAY_RECORDS.filter(
  (relay): relay is RelayRecord & { active: true; dataApiHost: string } =>
    relay.active && typeof relay.dataApiHost === "string",
).map(({ active: _active, ...relay }) => relay);

export const HISTORICAL_RELAYS: RelayClassification[] = ALL_RELAY_RECORDS.filter(
  (relay) => !relay.active,
).map(({ active: _active, dataApiHost: _dataApiHost, ...relay }) => relay);

const byId = new Map<string, RelayClassification>(
  [...RELAYS, ...HISTORICAL_RELAYS].map((relay) => [relay.id, relay]),
);

export function classifyRelay(id: string, date?: string): RelayClassification {
  const relay = byId.get(id);
  if (!relay) return { id, name: id, posture: "unknown" };

  if (date && relay.priorPostures) {
    for (const prior of relay.priorPostures) {
      if (date < prior.since) return { ...relay, posture: prior.posture };
    }
  }
  return relay;
}
