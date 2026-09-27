import definitions from "../../../data/creatures.json";
import type { FigureDefinition } from "@/game/combat/figure-config";
import type { Fighter, Item, Slot, Stats } from "@/game/types";
export interface Creature {
  id: string;
  name: string;
  description: string;
  portrait: { src: string; facing: "left" };
  source: { document: string; section: string };
  encounter: {
    combat: boolean;
    dialogue: boolean;
    minExpedition: number;
    weight: number;
    text?: string;
  };
  statWeights?: Stats;
  equipment: {
    slots: Slot[];
    allowedItems?: string[];
    /** One roll per loadout; omitted slots keep the default budget-based generation. */
    generationSlotChance?: Partial<Record<Exclude<Slot, "weapon">, number>>;
  };
  figures: FigureDefinition[];
  variants?: Record<string, { figures: FigureDefinition[] }>;
}
export const CREATURES = definitions as Creature[];
export const creature = (id?: string) => CREATURES.find((c) => c.id === id);
export function creatureFigures(
  f: Pick<Fighter, "creatureId" | "creatureVariant">,
) {
  const species = creature(f.creatureId);
  if (!species) return [];
  if (!f.creatureVariant) return species.figures;
  const variant = species.variants?.[f.creatureVariant];
  if (!variant)
    throw new Error(`Неизвестный вариант существа: ${f.creatureVariant}`);
  return variant.figures;
}
export const permitsEquipment = (
  f: Pick<Fighter, "creatureId">,
  equipment: Item,
) => {
  if (!f.creatureId) return true;
  const c = creature(f.creatureId);
  return (
    !!c &&
    c.equipment.slots.includes(equipment.slot) &&
    (!c.equipment.allowedItems ||
      c.equipment.allowedItems.includes(equipment.templateId ?? equipment.id))
  );
};
export function sampleCreature(
  expedition: number,
  random: () => number,
  variant?: string,
): Creature {
  const pool = CREATURES.filter(
    (c) =>
      c.encounter.combat &&
      c.encounter.minExpedition <= expedition &&
      (!variant || c.variants?.[variant]),
  );
  if (!pool.length) throw new Error("Для этой встречи нет доступных существ.");
  let cursor = random() * pool.reduce((n, c) => n + c.encounter.weight, 0);
  return (
    pool.find((c) => (cursor -= c.encounter.weight) < 0) ??
    pool[pool.length - 1]
  );
}
