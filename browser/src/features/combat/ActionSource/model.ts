import { item } from "@/game/equipment/catalog";
import { skill } from "@/game/skills/skills";
import type { Maneuver } from "@/game/types";

export function sourceName(m: Maneuver) {
  if (m.art) return m.name;
  return m.skillId
    ? `Навык: ${skill(m.skillId)?.name}`
    : m.weaponId || m.shieldId
      ? item(m.weaponId ?? m.shieldId).name
      : "Базовое действие";
}
