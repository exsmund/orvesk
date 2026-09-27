import definitions from "../../../data/damage-types.json";
import type { DamageType } from "@/game/types";
export interface DamageDefinition {
  name: string;
  description: string;
}
export const DAMAGE_TYPES: Record<DamageType, DamageDefinition> =
  definitions as Record<DamageType, DamageDefinition>;
