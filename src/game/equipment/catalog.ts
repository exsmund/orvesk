import BALANCE from "../../../data/combat-balance.json";
import { DAMAGE_TYPES } from "@/game/combat/damage-types";
import weapons from "../../../data/weapons.json";
import weaponWeights from "../../../data/weapon-weights.json";
import jewelry from "../../../data/jewelry.json";
import armor from "../../../data/armor.json";
import type { Item, Stat, DamageType, Slot } from "@/game/types";
export const ITEMS = [...weapons, ...armor, ...jewelry] as Item[];
export const WEAPON_WEIGHTS = weaponWeights;
/** Stable item reference: template@level. Plain template IDs denote level one. */
export function item(id?: string | null): Item {
  const [templateId, rawLevel] = (id ?? ITEMS[0].id).split("@");
  const template = ITEMS.find((i) => i.id === templateId) ?? ITEMS[0];
  const scales =
    !template.unarmed &&
    template.figures.some((m) => m.healthDamage?.stats.length);
  const level = scales
    ? Math.max(1, Math.min(999, Math.floor(Number(rawLevel) || 1)))
    : 1;
  return {
    ...template,
    id: level === 1 ? template.id : `${template.id}@${level}`,
    templateId: template.id,
    level,
    requirements: Object.fromEntries(
      Object.keys(template.requirements).map((stat) => [stat, level]),
    ),
  };
}
export const itemAtLevel = (equipment: Item, level: number) =>
  item(
    `${equipment.templateId ?? equipment.id.split("@")[0]}@${Math.max(1, Math.floor(level))}`,
  );
/** Hybrids consume the same stat-point budget as single-stat drops. */
export function rollItemLevel(
  equipment: Item,
  powerBudget: number,
  random: () => number,
): Item {
  const requirements = Math.max(1, Object.keys(equipment.requirements).length);
  const variation =
    BALANCE.loot.variation[
      Math.floor(random() * BALANCE.loot.variation.length)
    ];
  return itemAtLevel(
    equipment,
    1 + Math.floor(Math.max(0, powerBudget + variation) / requirements),
  );
}
export const STATS: Record<Stat, string> = {
  strength: "Сила",
  agility: "Ловкость",
  vitality: "Живучесть",
  intelligence: "Интеллект",
};
export const DAMAGE = Object.fromEntries(
  Object.entries(DAMAGE_TYPES).map(([id, def]) => [id, def.name]),
) as Record<DamageType, string>;
export const SLOTS: Record<Slot, string> = {
  weapon: "Правая рука",
  shield: "Левая рука",
  body: "Тело",
  feet: "Ноги",
  ring: "Кольцо",
  amulet: "Амулет",
};
